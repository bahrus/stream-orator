export interface StreamOratorOptions{
    filter?: (s: string) => string;
    streamContainerTag?: string;
    streamContainerTagAttributes?: string;
}