import {type GridSpec, runPorkchop} from '../core/porkchop';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<GridSpec>) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
};

scope.onmessage = (event) => {
  runPorkchop(event.data, (message) => {
    const transfer: Transferable[] = [];
    if (message.type === 'coarse' || message.type === 'band') {
      transfer.push(message.c3Km2S2.buffer, message.arrivalVInfKmS.buffer);
    }
    scope.postMessage(message, transfer);
  });
};
