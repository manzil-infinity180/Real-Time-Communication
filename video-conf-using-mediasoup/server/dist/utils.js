/**
 * kind: Media kind (“audio” or “video”).
 * mimeType: The codec MIME media type/subtype (e.g. “audio/opus”, “video/VP8”).
 * clockRate: Codec clock rate expressed in Hertz.
 * channels: The number of channels supported (e.g. two for stereo). Just for audio.
 *
 * DOCS: https://mediasoup.org/documentation/v3/mediasoup/api/#RouterOptions
 *
 *  mediasoup.types.RtpCodecCapability
 */
export const routerOptions = [{
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
    }
];
export const transportOption = {
    listenIps: [
        {
            ip: "127.0.0.1",
        },
    ],
    /**
     * Listen in UDP. Default true.
     */
    enableUdp: true,
    /**
     * Listen in TCP. Default true if webrtcServer is given, false otherwise.
     */
    enableTcp: true,
    /**
     * Prefer UDP. Default false.
     */
    preferUdp: true,
};
//# sourceMappingURL=utils.js.map