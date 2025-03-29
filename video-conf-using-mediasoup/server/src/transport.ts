import { IceParameters, IceCandidate, DtlsParameters } from "mediasoup/types";
import { router } from "./server.js";
import { transportOption } from "./utils.js";
import { error } from "node:console";

// typescript quick fixes helps for writing the types :)
export const createWebRtcTransport = async (
  callback: (arg0: {
    params:
      | {
          id: string;
          iceParameters: IceParameters;
          iceCandidates: IceCandidate[];
          dtlsParameters: DtlsParameters;
        }
      | { error: unknown };
  }) => void
) => {
  try {
    const transport = await router.createWebRtcTransport(transportOption);
    console.log(`Transport created: ${transport.id}`);

    /**
     * Monitors changes in the DTLS connection state.
     * Closes the transport if the DTLS state becomes closed.
     * This helps ensure resources are freed up when the transport is no longer needed.
     */
    transport.on("dtlsstatechange", (dtlstate) => {
      if (dtlstate === "closed") {
        transport.close();
      }
    });

    /**
     * Monitors transport closure events.
     * Useful for logging or cleaning up resources related to the transport.
     */
    transport.on("@close", () => {
      console.log("CLOSED:::Transport closed");
    });

    callback({
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      },
    });

    return transport;
  } catch (err: unknown) {
    console.log(err);

    callback({
      params: {
        error,
      },
    });
  }
};
