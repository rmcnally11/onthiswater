import { createElement } from "react";

export default function Image({ src, alt }) {
  return createElement("img", { src: typeof src === "string" ? src : "", alt: alt ?? "" });
}
