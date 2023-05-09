import React, { Suspense, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import $, { StylixProvider, useGlobalStyles } from "@stylix/core";
import MeViewer from "./MeViewer";
import MeEditor from "./MeEditor";
import { useObservable } from "/src";

const data = {
  me: {
    name: "Keck",
    phone: "555-555-5555",
    email: "keck@email.com",
  },
};

function ExampleApp() {
  useGlobalStyles({
    "*": {
      margin: 0,
      padding: 0,
      boxSizing: "border-box",
      font: "inherit",
    },
    html: {
      color: "#333",
      fontSize: 16,
      fontFamily: "sans-serif",
      lineHeight: 1.4,
    },
    body: {
      background: "#f5f5f5",
      paddingBottom: 100,
    },
  });

  const [editMe, setEditMe] = useState(false);

  const { store } = useObservable(data);

  return (
    <StylixProvider devMode={true}>
      <$.div
        margin-top="10vh"
        max-width={600}
        margin="10vh auto 0"
        border-radius={4}
        box-shadow="0 10px 30px #0002"
        background="#fefefe"
        border-top="1px solid #fff"
        border-bottom="1px solid #0003"
        padding="28px 30px"
      >
        <$.h1 font-weight="100" font-size={32} margin-bottom={50} text-align="center">
          Keck Contacts
        </$.h1>

        <$.h2 font-weight="100" font-size={22} margin-bottom={10}>
          My Information
        </$.h2>

        <Suspense fallback={<div>loading...</div>}>
          <SomethingLong />
        </Suspense>

        {editMe ? (
          <MeEditor
            info={store.me}
            onSave={(info) => {
              console.log({ info, data });
              setEditMe(false);
            }}
          />
        ) : (
          <MeViewer info={store.me} onClickEdit={() => setEditMe(true)} />
        )}
      </$.div>
    </StylixProvider>
  );
}
// Suspense:
// You just have to throw the promise. When it resolves, React will render the component again.
//
// let promise: any;
// let resolved = false;
//
// function SomethingLong() {
//   console.log("SomethingLong");
//
//   if (!resolved)
//     throw new Promise((resolve) => {
//       setTimeout(() => {
//         resolve(null);
//         resolved = true;
//       }, 3000);
//     });
//
//   return <div>something long</div>;
// }

ReactDOM.createRoot(document.getElementById("root")!).render(<ExampleApp />);
