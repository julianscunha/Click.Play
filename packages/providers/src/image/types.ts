export interface ImageProvider {
  generate(prompt: string, style?: string): Promise<Buffer>;
}
