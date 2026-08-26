"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

export type AddressResult = {
  formattedAddress: string;
  street?: string | null;
  streetNumber?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  district?: string | null; // Comuna/Delegación
};

type Props = {
  id?: string;
  name?: string;
  value?: string;
  onChange: (val: AddressResult | string) => void;
  placeholder?: string;
  country?: string; // ISO country code, default 'cl'
  required?: boolean;
};

export default function AddressAutocomplete({ id, name, value = "", onChange, placeholder = "Calle, número, comuna...", country = "cl", required = false }: Props) {
  const [providerFallback, setProviderFallback] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<any>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);


  const doNominatimSearch = useCallback(
    (q: string) => {
      if (!q || q.trim().length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(async () => {
        try {
          const url = new URL("/api/address/search", window.location.origin);
          url.searchParams.set("q", q);
          url.searchParams.set("country", country.toLowerCase());

          const res = await fetch(url.toString());
          if (!res.ok) throw new Error("Search failed");
          const data = await res.json();
          setSuggestions(data || []);
          setShowSuggestions(true);
          setProviderFallback(false);
        } catch (e) {
          console.warn("AddressAutocomplete: search error", e);
          setProviderFallback(true);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }, 250) as unknown as number;
    },
    [country]
  );

  const handleSelectSuggestion = async (item: any) => {
    const formatted = item.display_name || "";
    const addr = item.address || {};
    const street = addr.road || addr.pedestrian || addr.street || null;
    const streetNumber = addr.house_number || null;
    const city = addr.city || addr.town || addr.village || addr.county || null;
    const state = addr.state || addr.region || null;
    const postal = addr.postcode || null;
    const countryComp = addr.country || null;
    const district = addr.suburb || addr.district || addr.neighbourhood || null;
    const lat = item.lat ? parseFloat(item.lat) : null;
    const lng = item.lon ? parseFloat(item.lon) : null;

    onChange({ formattedAddress: formatted, street, streetNumber, city, state, postalCode: postal, country: countryComp, lat, lng, district });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          id={id}
          name={name || id}
          value={typeof value === "string" ? value : (value && (value as AddressResult).formattedAddress) || ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v);
            doNominatimSearch(v);
          }}
          onFocus={() => {
            const v = (typeof value === "string" ? value : (value && (value as AddressResult).formattedAddress) || "") as string;
            if (v && v.length >= 3) doNominatimSearch(v);
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          aria-autocomplete="list"
          required={required}
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-40 left-0 right-0 bg-white border border-slate-200 rounded mt-1 max-h-56 overflow-auto">
            {suggestions.map((s, idx) => (
              <li
                key={s.place_id || s.osm_id || idx}
                className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSuggestion(s);
                }}
              >
                {s.display_name}
              </li>
            ))}
          </ul>
        )}

        {providerFallback && (
          <div className="text-sm text-yellow-600 mt-1">Proveedor libre no disponible, usa la entrada manual.</div>
        )}
      </div>
    </div>
  );
}
