// declarations.d.ts (or shims.d.ts)
declare module "*.png" {
  const value: string;
  export default value;
}
declare module "*.jpg"; // Add these for other image types as well for consistency
declare module "*.jpeg";
declare module "*.gif";
declare module "*.webp";

declare module "*.svg" {
  import * as React from "react";
  import { SvgProps } from "react-native-svg";
  const content: React.FC<SvgProps>;
  export default content;
}
