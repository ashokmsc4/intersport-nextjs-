"use client";

export type Governorate = {
  governorate: string;
  areas: { area: string; area_name: string }[];
};

export type AreaValue = { governorate: string; areaId: string; areaName: string };

/** Governorate + area pickers backed by `V1/aaw/arealist`. */
export function AreaSelect({
  governorates,
  value,
  onChange,
  labels,
}: {
  governorates: Governorate[];
  value: AreaValue;
  onChange: (value: AreaValue) => void;
  labels: { governorate: string; area: string; chooseArea: string };
}) {
  const areas =
    governorates.find((g) => g.governorate === value.governorate)?.areas ?? [];
  const selectClass = "rounded border border-neutral-300 px-3 py-2 text-base";

  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{labels.governorate}</span>
        <select
          value={value.governorate}
          onChange={(e) =>
            onChange({ governorate: e.target.value, areaId: "", areaName: "" })
          }
          required
          className={selectClass}
        >
          <option value="" disabled />
          {governorates.map((g) => (
            <option key={g.governorate} value={g.governorate}>
              {g.governorate}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{labels.area}</span>
        <select
          value={value.areaId}
          onChange={(e) => {
            const area = areas.find((a) => a.area === e.target.value);
            onChange({
              governorate: value.governorate,
              areaId: area?.area ?? "",
              areaName: area?.area_name ?? "",
            });
          }}
          disabled={!value.governorate}
          required
          className={selectClass}
        >
          <option value="">{labels.chooseArea}</option>
          {areas.map((a) => (
            <option key={a.area} value={a.area}>
              {a.area_name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
