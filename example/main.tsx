import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { z } from "zod";
import { useForm, useFormContext, useInputProps, zodValidator } from "./valtio-forms";
import { get } from "lodash-es";

function Input(props: { field: string } & React.HTMLProps<HTMLInputElement>) {
  const { field, ...rest } = props;
  const inputProps = useInputProps(field, { type: props.type || "text" });
  return <input {...rest} {...inputProps} />;
}

function SayHello() {
  const { state } = useFormContext();
  console.log("render SayHello", state.values.name);
  return <div>Hello {state.values.name}!</div>;
}

function ErrorMessage(props: { field: string }) {
  const { field } = props;
  const { state } = useFormContext();

  console.log("render ErrorMessage", field, get(state.errors, field));

  return <div>{get(state.errors as any, field)?.join?.("; ")}</div>;
}

function Hobbies() {
  const { state, updater } = useFormContext<MyForm>();
  return (
    <div>
      {state.values.hobbies.map((hobby, i) => (
        <div key={i}>
          <Input field={`hobbies.${i}.value`} />
          <ErrorMessage field={`hobbies.${i}.value`} />
        </div>
      ))}
      <button
        onClick={() => {
          updater.values.hobbies.push({ value: "" });
        }}
      >
        Add hobby
      </button>
    </div>
  );
}

function Form() {
  const { state, updater } = useFormContext<MyForm>();
  return (
    <div>
      <SayHello />

      <div>
        <Input field="name" />
        <ErrorMessage field="name" />
      </div>
      <div>
        <Input field="age" type="number" />
        <ErrorMessage field="age" />
      </div>

      <Hobbies />

      <ErrorMessage field={`hobbies-unique`} />
      <ErrorMessage field={`hobbies-name`} />
    </div>
  );
}

const myForm = z
  .object({
    name: z.string().min(3),
    age: z.coerce.number().min(10),
    hobbies: z
      .array(
        z.object({
          value: z.string().min(1),
          other: z.string().optional(),
        })
      )
      .min(1),
    "hobbies-name": z.never().optional(),
    "hobbies-unique": z.never().optional(),
  })
  .refine((v) => !v.hobbies.find((h) => h.value === v.name), {
    message: "Hobby can't match name",
    path: ["hobbies-name"],
  })
  .refine((v) => v.hobbies.length === new Set(v.hobbies.map((h) => h.value)).size, {
    message: "Hobbies must be unique",
    path: ["hobbies-unique"],
  });
type MyForm = z.infer<typeof myForm>;

function Debugger() {
  const { state } = useFormContext();
  return <pre>{JSON.stringify(state, null, 2)}</pre>;
}

function App() {
  const f = useForm({
    initialValues: {
      name: "Alex",
      age: 20,
      hobbies: [] as { value: string }[],
    },
    validate: zodValidator(myForm),
  });

  return (
    <f.Provider>
      <Form />

      <Debugger />
    </f.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
