import $, { StylixProps } from "@stylix/core";
import { Button } from "./ui";
import React from "react";
import { useObserver } from "/src";
import { ContactInfo } from "./types";

function Input(props: StylixProps<"div", { label: string; field: string; object: any }>) {
  const { label, field, object, ...styles } = props;
  return (
    <$.div {...styles}>
      <$.div>{label}</$.div>
      <$.input
        display="block"
        border="1px solid #ccc"
        border-radius={3}
        padding={4}
        value={object[field]}
        onChange={(e) => {
          object[field] = e.target.value;
        }}
      />
    </$.div>
  );
}

export default function MeEditor(props: {
  info: ContactInfo;
  onSave: (info: ContactInfo) => void;
}) {
  const [store] =useObserver(props.info);

  return (
    <$.div display="flex">
      <$.div flex="1 1 auto">
        <Input label="Name" field="name" object={store} />
      </$.div>
      <$.div flex="0 0 auto">
        <Button onClick={() => props.onSave(store)}>Edit</Button>
      </$.div>
    </$.div>
  );
}
