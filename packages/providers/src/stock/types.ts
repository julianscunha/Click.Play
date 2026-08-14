export type StockProviderKey = "pexels" | "pixabay";

export interface StockCandidate {
  url: string;
  width: number;
  height: number;
  /** segundos, só pra vídeo */
  duration?: number;
  /** id específico do provider, pra dedup */
  id: string;
}

export interface StockAsset {
  filePath: string;
  width: number;
  height: number;
  duration?: number;
}

export interface StockProvider {
  readonly id: StockProviderKey;
  searchVideo(query: string): Promise<StockCandidate[]>;
  searchImage(query: string): Promise<StockCandidate[]>;
  download(candidate: StockCandidate): Promise<StockAsset>;
}
