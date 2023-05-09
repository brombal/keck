import $ from "@stylix/core";
import { Button } from "./ui";
import React from "react";
import { ContactInfo } from "./types";

export default function MeViewer(props: { info: ContactInfo; onClickEdit: () => void }) {
  const { info, onClickEdit } = props;

  return (
    <$.div display="flex">
      <$.div flex="1 1 auto">
        <$.div>{info.name}</$.div>
        <$.div>{info.phone}</$.div>
        <$.div>{info.email}</$.div>
      </$.div>
      <$.div flex="0 0 auto">
        <Button onClick={onClickEdit}>Edit</Button>
      </$.div>
    </$.div>
  );
}
