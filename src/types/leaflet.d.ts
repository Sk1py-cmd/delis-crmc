declare module "leaflet" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const L: any;
  export = L;
}

declare module "leaflet/dist/leaflet.css" {
  const content: string;
  export default content;
}
