import $, { StylixProps } from "@stylix/core";
import React from "react";

export function Button(props: StylixProps) {
  return (
    <$.button
      border={0}
      padding="2px 20px 0"
      height={32}
      min-width={80}
      color="hsl(200, 100%, 35%)"
      background="hsl(200, 80%, 95%)"
      border-radius={4}
      cursor="pointer"
      font-size={14}
      $css={{
        "&:hover": {
          background: "hsl(200, 80%, 92%)",
        }
      }}
      {...props}
    />
  );
}
