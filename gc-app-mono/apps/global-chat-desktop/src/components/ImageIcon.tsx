import { FC, ImgHTMLAttributes } from "react";

export const ImageIcon: FC<ImgHTMLAttributes<HTMLImageElement>> = (props) => {
  return <img {...props} alt={props.alt || ""} />;
};
