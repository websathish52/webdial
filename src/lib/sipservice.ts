import {
  UserAgent,
  Registerer,
  Inviter,
  Session,
  SessionState,
  UserAgentOptions,
  InviterOptions,
} from "sip.js";

type CallState =
  | "idle"
  | "connecting"
  | "ringing"
  | "connected"
  | "ended"
  | "failed";

type SIPConfig = {
  wsServer: string;
  sipUri: string;
  authorizationUsername: string;
  authorizationPassword: string;
  displayName?: string;
};

class SIPService {
  private userAgent: UserAgent | null = null;
  private registerer: Registerer | null = null;
  private session: Session | null = null;

  private audioElement: HTMLAudioElement | null = null;

  private state: CallState = "idle";

  private onStateChange?: (state: CallState) => void;

  configureStateListener(callback: (state: CallState) => void) {
    this.onStateChange = callback;
  }

  private setState(state: CallState) {
    this.state = state;
    this.onStateChange?.(state);
  }

  getState() {
    return this.state;
  }

  async connect(config: SIPConfig) {
    if (this.userAgent) {
      return;
    }

    const uri = UserAgent.makeURI(config.sipUri);

    if (!uri) {
      throw new Error("Invalid SIP URI");
    }

    const options: UserAgentOptions = {
      uri,

      transportOptions: {
        server: config.wsServer,
      },

      authorizationUsername: config.authorizationUsername,
      authorizationPassword: config.authorizationPassword,

      displayName: config.displayName || "WebDial Agent",

      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionConfiguration: {
          iceServers: [
            {
              urls: "stun:stun.l.google.com:19302",
            },
          ],
        },
      },
    };

    this.userAgent = new UserAgent(options);

    this.userAgent.delegate = {
      onInvite: async (invitation) => {
        console.log("Incoming SIP call", invitation);
      },
    };

    await this.userAgent.start();

    this.registerer = new Registerer(this.userAgent);

    await this.registerer.register();

    this.setState("idle");

    console.log("SIP registered");
  }

  async call(phoneNumber: string) {
    if (!this.userAgent) {
      throw new Error("SIP is not connected");
    }

    if (this.session) {
      throw new Error("A call is already active");
    }

    const target = this.normalizePhone(phoneNumber);

    const targetUri = UserAgent.makeURI(
      `sip:${target}@${this.getDomain()}`
    );

    if (!targetUri) {
      throw new Error("Invalid customer SIP URI");
    }

    const inviterOptions: InviterOptions = {
      sessionDescriptionHandlerOptions: {
        constraints: {
          audio: true,
          video: false,
        },
      },
    };

    const inviter = new Inviter(
      this.userAgent,
      targetUri,
      inviterOptions
    );

    this.session = inviter;

    this.attachSessionEvents(inviter);

    this.setState("connecting");

    await inviter.invite();
  }

  private attachSessionEvents(session: Session) {
    session.stateChange.addListener((state) => {
      console.log("SIP session state:", state);

      switch (state) {
        case SessionState.Establishing:
          this.setState("ringing");
          break;

        case SessionState.Established:
          this.setState("connected");
          void this.attachRemoteAudio(session);
          break;

        case SessionState.Terminated:
          this.setState("ended");
          this.cleanup();
          break;
      }
    });
  }

  private async attachRemoteAudio(session: Session) {
    const handler: any = session.sessionDescriptionHandler;

    if (!handler) {
      return;
    }

    const peerConnection = handler.peerConnection;

    if (!peerConnection) {
      return;
    }

    const remoteStream = new MediaStream();

    peerConnection.getReceivers().forEach((receiver: RTCRtpReceiver) => {
      if (receiver.track) {
        remoteStream.addTrack(receiver.track);
      }
    });

    if (!this.audioElement) {
      this.audioElement = document.createElement("audio");
      this.audioElement.autoplay = true;
      this.audioElement.style.display = "none";
      document.body.appendChild(this.audioElement);
    }

    this.audioElement.srcObject = remoteStream;

    try {
      await this.audioElement.play();
    } catch (error) {
      console.warn("Remote audio autoplay blocked:", error);
    }
  }

  async endCall() {
    if (!this.session) {
      return;
    }

    try {
      const session = this.session;

      if (session.state === SessionState.Established) {
        await (session as any).bye();
      } else if (session.state === SessionState.Establishing) {
        await (session as any).cancel();
      }
    } catch (error) {
      console.error("Failed to end SIP call:", error);
    } finally {
      this.cleanup();
    }
  }

  async mute() {
    const handler: any = this.session?.sessionDescriptionHandler;

    if (!handler) {
      return;
    }

    const peerConnection = handler.peerConnection;

    if (!peerConnection) {
      return;
    }

    peerConnection.getSenders().forEach((sender: RTCRtpSender) => {
      if (sender.track?.kind === "audio") {
        sender.track.enabled = false;
      }
    });
  }

  async unmute() {
    const handler: any = this.session?.sessionDescriptionHandler;

    if (!handler) {
      return;
    }

    const peerConnection = handler.peerConnection;

    if (!peerConnection) {
      return;
    }

    peerConnection.getSenders().forEach((sender: RTCRtpSender) => {
      if (sender.track?.kind === "audio") {
        sender.track.enabled = true;
      }
    });
  }

  private cleanup() {
    this.session = null;
    this.setState("idle");
  }

  async disconnect() {
    try {
      await this.endCall();

      if (this.registerer) {
        await this.registerer.unregister();
      }

      if (this.userAgent) {
        await this.userAgent.stop();
      }
    } catch (error) {
      console.error("SIP disconnect error:", error);
    }

    this.userAgent = null;
    this.registerer = null;

    if (this.audioElement) {
      this.audioElement.srcObject = null;
      this.audioElement.remove();
      this.audioElement = null;
    }

    this.setState("idle");
  }

  private normalizePhone(phone: string) {
    let value = String(phone).replace(/\D/g, "");

    if (value.startsWith("91") && value.length === 12) {
      return value;
    }

    if (value.length === 10) {
      return `91${value}`;
    }

    return value;
  }

  private getDomain() {
    if (!this.userAgent) {
      return "";
    }

    return this.userAgent.configuration.uri.host;
  }
}

export const sipService = new SIPService();