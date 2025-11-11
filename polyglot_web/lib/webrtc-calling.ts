/**
 * WebRTC Voice and Video Calling
 * Free peer-to-peer voice and video calls with end-to-end encryption
 *
 * Features:
 * - Voice calls
 * - Video calls
 * - Screen sharing
 * - Built-in encryption (DTLS-SRTP)
 * - No server-side media processing (peer-to-peer)
 */

export type CallType = 'voice' | 'video';
export type CallState =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

export interface CallOptions {
  audio: boolean;
  video: boolean;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface WebRTCCallbacks {
  onStateChange?: (state: CallState) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onDataChannelMessage?: (message: string) => void;
}

/**
 * WebRTC Call Manager
 * Handles peer-to-peer voice and video calls
 */
export class WebRTCCallManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private callState: CallState = 'idle';
  private callbacks: WebRTCCallbacks;

  // Free STUN servers (Google's public STUN servers)
  private static DEFAULT_ICE_SERVERS: IceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  constructor(
    callbacks: WebRTCCallbacks = {},
    iceServers: IceServer[] = WebRTCCallManager.DEFAULT_ICE_SERVERS
  ) {
    this.callbacks = callbacks;
    this.initializePeerConnection(iceServers);
  }

  /**
   * Check if WebRTC is supported
   */
  static isSupported(): boolean {
    return !!(
      window.RTCPeerConnection &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  /**
   * Initialize peer connection
   */
  private initializePeerConnection(iceServers: IceServer[]): void {
    const configuration: RTCConfiguration = {
      iceServers,
      iceCandidatePoolSize: 10,
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks.onIceCandidate?.(event.candidate);
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.callbacks.onRemoteStream?.(this.remoteStream);
      }
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream!.addTrack(track);
      });
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection!.connectionState;
      switch (state) {
        case 'connected':
          this.updateCallState('connected');
          break;
        case 'disconnected':
          this.updateCallState('disconnected');
          break;
        case 'failed':
          this.updateCallState('failed');
          this.callbacks.onError?.(new Error('Connection failed'));
          break;
        case 'closed':
          this.updateCallState('disconnected');
          break;
      }
    };

    // Handle data channel
    this.peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };
  }

  /**
   * Set up data channel for signaling
   */
  private setupDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
    };

    this.dataChannel.onmessage = (event) => {
      this.callbacks.onDataChannelMessage?.(event.data);
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
    };
  }

  /**
   * Start a call (caller side)
   */
  async startCall(callType: CallType): Promise<RTCSessionDescriptionInit> {
    try {
      this.updateCallState('calling');

      // Get user media
      const options: CallOptions = {
        audio: true,
        video: callType === 'video',
      };

      this.localStream = await this.getUserMedia(options);
      this.callbacks.onLocalStream?.(this.localStream);

      // Add tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Create data channel for messaging
      this.dataChannel = this.peerConnection!.createDataChannel('messaging');
      this.setupDataChannel(this.dataChannel);

      // Create offer
      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);

      return offer;
    } catch (error) {
      this.updateCallState('failed');
      throw new Error(`Failed to start call: ${(error as Error).message}`);
    }
  }

  /**
   * Answer a call (receiver side)
   */
  async answerCall(
    offer: RTCSessionDescriptionInit,
    callType: CallType
  ): Promise<RTCSessionDescriptionInit> {
    try {
      this.updateCallState('connecting');

      // Set remote description
      await this.peerConnection!.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      // Get user media
      const options: CallOptions = {
        audio: true,
        video: callType === 'video',
      };

      this.localStream = await this.getUserMedia(options);
      this.callbacks.onLocalStream?.(this.localStream);

      // Add tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Create answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      return answer;
    } catch (error) {
      this.updateCallState('failed');
      throw new Error(`Failed to answer call: ${(error as Error).message}`);
    }
  }

  /**
   * Complete call setup (caller receives answer)
   */
  async completeCall(answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      await this.peerConnection!.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      this.updateCallState('connecting');
    } catch (error) {
      this.updateCallState('failed');
      throw new Error(`Failed to complete call: ${(error as Error).message}`);
    }
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  /**
   * Toggle microphone
   */
  toggleMicrophone(): boolean {
    if (!this.localStream) return false;

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    const enabled = !audioTracks[0].enabled;
    audioTracks.forEach((track) => {
      track.enabled = enabled;
    });

    return enabled;
  }

  /**
   * Toggle camera
   */
  toggleCamera(): boolean {
    if (!this.localStream) return false;

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return false;

    const enabled = !videoTracks[0].enabled;
    videoTracks.forEach((track) => {
      track.enabled = enabled;
    });

    return enabled;
  }

  /**
   * Switch camera (front/back on mobile)
   */
  async switchCamera(): Promise<void> {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const currentFacingMode =
      videoTrack.getSettings().facingMode || 'user';
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    // Stop current video track
    videoTrack.stop();

    // Get new video stream
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: newFacingMode },
    });

    const newVideoTrack = newStream.getVideoTracks()[0];

    // Replace track in peer connection
    const sender = this.peerConnection
      ?.getSenders()
      .find((s) => s.track?.kind === 'video');

    if (sender) {
      await sender.replaceTrack(newVideoTrack);
    }

    // Replace in local stream
    this.localStream.removeTrack(videoTrack);
    this.localStream.addTrack(newVideoTrack);
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    try {
      // @ts-ignore - getDisplayMedia not in all TS versions
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      const screenTrack = screenStream.getVideoTracks()[0];

      // Find video sender and replace track
      const sender = this.peerConnection
        ?.getSenders()
        .find((s) => s.track?.kind === 'video');

      if (sender) {
        const oldTrack = sender.track;
        await sender.replaceTrack(screenTrack);

        // When screen sharing stops, restore camera
        screenTrack.onended = async () => {
          if (oldTrack && sender) {
            await sender.replaceTrack(oldTrack);
          }
        };
      }
    } catch (error) {
      throw new Error(
        `Failed to start screen share: ${(error as Error).message}`
      );
    }
  }

  /**
   * Send data channel message
   */
  sendMessage(message: string): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(message);
    }
  }

  /**
   * End call
   */
  endCall(): void {
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    // Close data channel
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.updateCallState('disconnected');
  }

  /**
   * Get call state
   */
  getCallState(): CallState {
    return this.callState;
  }

  /**
   * Get user media (camera/microphone)
   */
  private async getUserMedia(options: CallOptions): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: options.audio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : false,
        video: options.video
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            }
          : false,
      };

      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      throw new Error(`Failed to get user media: ${(error as Error).message}`);
    }
  }

  /**
   * Update call state
   */
  private updateCallState(state: CallState): void {
    this.callState = state;
    this.callbacks.onStateChange?.(state);
  }

  /**
   * Get connection stats
   */
  async getStats(): Promise<RTCStatsReport | null> {
    if (!this.peerConnection) return null;
    return await this.peerConnection.getStats();
  }
}

/**
 * Call signaling message types
 */
export interface CallSignalingMessage {
  type: 'call-offer' | 'call-answer' | 'ice-candidate' | 'call-end';
  threadId: string;
  senderId: string;
  callType: CallType;
  data?: any;
}

/**
 * Create call offer message
 */
export function createCallOfferMessage(
  threadId: string,
  senderId: string,
  callType: CallType,
  offer: RTCSessionDescriptionInit
): CallSignalingMessage {
  return {
    type: 'call-offer',
    threadId,
    senderId,
    callType,
    data: offer,
  };
}

/**
 * Create call answer message
 */
export function createCallAnswerMessage(
  threadId: string,
  senderId: string,
  callType: CallType,
  answer: RTCSessionDescriptionInit
): CallSignalingMessage {
  return {
    type: 'call-answer',
    threadId,
    senderId,
    callType,
    data: answer,
  };
}

/**
 * Create ICE candidate message
 */
export function createIceCandidateMessage(
  threadId: string,
  senderId: string,
  candidate: RTCIceCandidate
): CallSignalingMessage {
  return {
    type: 'ice-candidate',
    threadId,
    senderId,
    callType: 'voice', // Doesn't matter for ICE
    data: candidate.toJSON(),
  };
}

/**
 * Create call end message
 */
export function createCallEndMessage(
  threadId: string,
  senderId: string
): CallSignalingMessage {
  return {
    type: 'call-end',
    threadId,
    senderId,
    callType: 'voice',
  };
}
