# Conform + Aksel: Mønstre og fallgruver

Vi bruker [Conform](https://conform.guide/) for skjemavalidering med Zod v4 og Aksel-komponenter.

## Oppsett

```bash
npm install @conform-to/react @conform-to/zod
```

**Viktig:** Importer alltid fra `@conform-to/zod/v4`, IKKE `@conform-to/zod`. Standard-entrypointet bruker Zod v3-internals som ikke finnes i Zod v4.

## React Router `<Form>` — IKKE bruk `getFormProps`

`getFormProps(form)` sprer `onSubmit` som overstyrer React Routers interne submit-handler:

```tsx
// ❌ FEIL — getFormProps overstyrer React Routers onSubmit
<Form method="post" {...getFormProps(form)}>

// ✅ RIKTIG — sett props eksplisitt
<Form method="post" id={form.id} onSubmit={form.onSubmit} noValidate>
```

For `fetcher.Form` i modaler er `getFormProps` trygt fordi modalene bruker en custom `onSubmit` med `event.preventDefault()` og `fetcher.submit()`.

## Native `<Select>` — bruk `name` direkte

Aksel `<Select>` rendrer en nativ `<select>`. Bruk `name`-prop direkte i stedet for hidden input + `useInputControl`:

```tsx
// ❌ FEIL — useEffect-timing kan gi stale FormData
<input name={fields.kategori.name} defaultValue={fields.kategori.initialValue} hidden />
<Select value={kontroll.value} onChange={(e) => kontroll.change(e.target.value)} />

// ✅ RIKTIG — nativ select deltar i FormData umiddelbart
<Select
  name={fields.kategori.name}
  id={fields.kategori.id}
  defaultValue={fields.kategori.initialValue ?? ""}
  error={fields.kategori.errors?.[0]}
>
```

Bruk `useInputControl` + hidden input KUN for komponenter som IKKE rendrer native form-elementer (DatePicker, Combobox).

## `getZodConstraint` og komplekse skjemaer

`getZodConstraint()` krasjer med "Unsupported schema" for skjemaer med `.transform()` eller `.refine()` på toppnivå. `constraint` er valgfritt i `useForm` — utelat det for komplekse skjemaer.

## Modal-mønster (fetcher-basert)

```tsx
const fetcher = useFetcher();
const [form, fields] = useForm({
  id: "unikt-id",
  lastResult: fetcher.state === "idle" ? fetcher.data : null,
  onValidate({ formData }) {
    return parseWithZod(formData, { schema });
  },
  shouldValidate: "onBlur",
  shouldRevalidate: "onInput",
  onSubmit(event, { formData }) {
    event.preventDefault();
    fetcher.submit(formData, { method: "post", action: "..." });
    form.reset();
    onClose();
  },
});

return (
  <fetcher.Form method="post" {...getFormProps(form)}>
    {/* felter */}
  </fetcher.Form>
);
```

## Helsides skjema-mønster (React Router `<Form>`)

```tsx
const lastResult = useActionData<typeof action>();
const [form, fields] = useForm({
  id: "skjema-id",
  lastResult: lastResult && "status" in lastResult ? lastResult : undefined,
  onValidate({ formData }) {
    return parseWithZod(formData, { schema });
  },
  shouldValidate: "onSubmit",
  shouldRevalidate: "onInput",
});

return (
  <Form method="post" id={form.id} onSubmit={form.onSubmit} noValidate>
    {/* felter */}
  </Form>
);
```

## Komponent-mønstre

### TextField / Textarea (uncontrolled)

```tsx
<TextField
  key={fields.navn.key}
  name={fields.navn.name}
  defaultValue={fields.navn.initialValue}
  error={fields.navn.errors?.[0]}
/>
```

### Select (nativ)

```tsx
<Select
  name={fields.kategori.name}
  id={fields.kategori.id}
  defaultValue={fields.kategori.initialValue ?? ""}
  error={fields.kategori.errors?.[0]}
>
  <option value="">Velg...</option>
</Select>
```

### RadioGroup (useInputControl + hidden input)

```tsx
const kontroll = useInputControl(fields.grunn);

<input name={fields.grunn.name} defaultValue={fields.grunn.initialValue} hidden />
<RadioGroup
  legend="Grunn"
  value={kontroll.value ?? ""}
  onChange={kontroll.change}
  onBlur={kontroll.blur}
  error={fields.grunn.errors?.[0]}
>
  <Radio value="A">Alternativ A</Radio>
</RadioGroup>
```

### DatePicker (useInputControl + hidden input)

DatePicker lager ikke et navngitt input-element. Bruk hidden input:

```tsx
const kontroll = useInputControl(fields.dato);

<input name={fields.dato.name} defaultValue={fields.dato.initialValue} hidden />
<DatePicker
  onDateChange={(dato) => kontroll.change(dato?.toISOString().slice(0, 10) ?? "")}
>
  <DatePicker.Input label="Dato" error={fields.dato.errors?.[0]} />
</DatePicker>
```

### Checkbox (useState + hidden input)

`useInputControl` fungerer IKKE for checkboxer. Bruk `useState`:

```tsx
const [checked, setChecked] = useState(fields.aktiv.initialValue === "true");

<input type="hidden" name={fields.aktiv.name} value={checked ? "true" : "false"} />
<Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
  Aktiv
</Checkbox>
```

## Server-side (action)

```ts
import { parseWithZod } from "@conform-to/zod/v4";

const submission = parseWithZod(formData, { schema });
if (submission.status !== "success") {
  return submission.reply();
}
// submission.value har validerte data
```

## Test-mønstre

- `useFetcher`-mock må inkludere `Form: "form"` dersom komponenten bruker `fetcher.Form`
- FormData-assertions: `expect(formData.get("felt")).toBe("verdi")`
- Conform `onSubmit` kjører kun ved vellykket validering — test "submit ikke kalt" i stedet for "knapp disabled"
