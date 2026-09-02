declare module "leaflet" {
  const L: any;
  export = L;
}

declare module "leaflet/dist/leaflet.css" {
  const content: string;
  export default content;
}
