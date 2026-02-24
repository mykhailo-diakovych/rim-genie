declare module "signature_pad" {
  export default class SignaturePad {
    constructor(canvas: HTMLCanvasElement, options?: unknown);
    isEmpty(): boolean;
    off(): void;
    toDataURL(type?: string): string;
    addEventListener(event: string, handler: () => void): void;
  }
}
