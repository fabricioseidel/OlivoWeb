"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPinIcon } from "@heroicons/react/24/outline";

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
  value?: string;
  onChange: (val: AddressResult | string) => void;
  placeholder?: string;
  country?: string; // ISO country code, default 'cl'
  required?: boolean;
};

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google Maps script failed to load"));
    document.head.appendChild(s);
  });
}

export default function AddressAutocomplete({ value = "", onChange, placeholder = "Calle, número, comuna...", country = "cl", required = false }: Props) {
  const ref = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);
  const [fallback, setFallback] = useState(false);
  const [providerFallback, setProviderFallback] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<any>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const debounceRef = useRef<number | null>(null);
  const provider = (process.env.NEXT_PUBLIC_ADDRESS_PROVIDER || "google").toLowerCase();

  const addLog = (msg: string) => {
    console.log(`[AddressAutocomplete] ${msg}`);
    setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
      addLog(`MOUNTED. Provider: '${provider}'`);
      if (typeof window !== 'undefined') {
          addLog(`Window exists. Google object: ${!!(window as any).google}`);
      }
  }, []);

  const parseGooglePlace = (place: any) => {
    const formatted = place.formatted_address || "";
    const comps = place.address_components || [];
    const getComp = (types: string[]) => {
      const c = comps.find((x: any) => types.every((t) => x.types.includes(t)));
      return c?.long_name ?? null;
    };
    const street = getComp(["route"]) || null;
    const streetNumber = getComp(["street_number"]) || null;
    // City logic: Try locality (City/Comuna) -> sublocality -> admin_area_2 (Province)
    const city = getComp(["locality"]) || getComp(["sublocality"]) || getComp(["administrative_area_level_2"]) || null;
    // District logic: Try admin_area_3 (Comuna specific) -> locality -> sublocality
    const district = getComp(["administrative_area_level_3"]) || getComp(["locality"]) || getComp(["sublocality"]) || null;
    
    const state = getComp(["administrative_area_level_1"]) || null;
    const postal = getComp(["postal_code"]) || null;
    const countryComp = getComp(["country"]) || null;
    const lat = place.geometry?.location?.lat?.() ?? null;
    const lng = place.geometry?.location?.lng?.() ?? null;

    return { formattedAddress: formatted, street, streetNumber, city, state, postalCode: postal, country: countryComp, lat, lng, district };
  };

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    let mounted = true;

    if (provider === "nominatim") {
      addLog("Provider is nominatim. Skipping Google init.");
      // Nominatim will be handled in the input change handler (no external script)
      setProviderFallback(false);
      return () => {
        mounted = false;
      };
    }

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      addLog("Error: API Key missing in env");
      setFallback(true);
      return () => {
        mounted = false;
      };
    }

    addLog(`Starting Google Maps init with key: ${key.substring(0, 5)}...`);
    const src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&v=weekly`;

    // Setup global auth failure handler
    (window as any).gm_authFailure = () => {
      addLog("CRITICAL: Google Maps Auth Failure detected!");
      console.error("Google Maps Auth Failure");
      setFallback(true);
    };

    loadScript(src)
      .then(() => {
        if (!mounted) return;
        addLog("Script loaded. Waiting for initialization...");
        
        // Small delay to ensure google object is fully initialized
        setTimeout(() => {
            try {
              if (typeof window === "undefined" || !(window as any).google) {
                addLog("Error: window.google not found");
                console.warn("AddressAutocomplete: google object not found after script load");
                setFallback(true);
                return;
              }

              const g = (window as any).google;
              if (!g.maps) {
                 addLog("Error: google.maps not found");
                 setFallback(true);
                 return;
              }
              if (!g.maps.places) {
                 addLog("Error: google.maps.places not found (Check Places API)");
                 setFallback(true);
                 return;
              }
              if (!g.maps.places.Autocomplete) {
                addLog("Error: Autocomplete constructor not found");
                console.warn("AddressAutocomplete: Places API not available.");
                setFallback(true);
                return;
              }

              addLog("Google Maps API ready. Initializing Autocomplete...");
              autocompleteRef.current = new g.maps.places.Autocomplete(ref.current, {
                componentRestrictions: { country: country.toUpperCase() },
                fields: ["formatted_address", "address_components", "geometry"],
                types: ["geocode"],
              });

              addLog("Autocomplete initialized successfully");

              autocompleteRef.current.addListener("place_changed", () => {
                try {
                  addLog("Place selected");
                  const place = autocompleteRef.current.getPlace();
                  const result = parseGooglePlace(place);
                  if (!result.formattedAddress && ref.current) {
                      result.formattedAddress = ref.current.value;
                  }
                  onChangeRef.current(result);
                } catch (inner) {
                  addLog("Error reading place details");
                  console.warn("AddressAutocomplete: error reading place", inner);
                }
              });
            } catch (e: any) {
              addLog(`Exception during init: ${e.message}`);
              console.warn("AddressAutocomplete: google places init failed", e);
              setFallback(true);
            }
        }, 1000); // Increased delay to 1s for debugging
      })
      .catch((err) => {
        addLog(`Script load error: ${err.message}`);
        console.warn("AddressAutocomplete load script error", err);
        setFallback(true);
      });

    return () => {
      mounted = false;
    };
  }, [country]); // Removed onChange from dependencies to prevent re-init loops

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalización no soportada por tu navegador");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (typeof window !== "undefined" && (window as any).google && (window as any).google.maps) {
             const geocoder = new (window as any).google.maps.Geocoder();
             geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: any, status: any) => {
                 if (status === "OK" && results[0]) {
                     const result = parseGooglePlace(results[0]);
                     onChange(result);
                 } else {
                     console.error("Geocoder failed: " + status);
                     alert("No se pudo encontrar la dirección para tu ubicación actual.");
                 }
                 setIsLocating(false);
             });
        } else {
            alert("Google Maps no está listo todavía. Intenta de nuevo en unos segundos.");
            setIsLocating(false);
        }
      },
      (error) => {
        console.error("Error getting location", error);
        setIsLocating(false);
        let msg = "No se pudo obtener tu ubicación.";
        if (error.code === 1) msg += " Permiso denegado.";
        else if (error.code === 2) msg += " Ubicación no disponible.";
        else if (error.code === 3) msg += " Tiempo de espera agotado.";
        alert(msg);
      }
    );
  };

  // Nominatim search handler (client-side, free provider)
  const doNominatimSearch = useCallback(
    (q: string) => {
      if (!q || q.trim().length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // debounce
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(async () => {
        try {
          // Use internal proxy to avoid exposing client IP and handle caching/headers
          const url = new URL("/api/address/search", window.location.origin);
          url.searchParams.set("q", q);
          url.searchParams.set("country", country.toLowerCase());

          const res = await fetch(url.toString(), {
            headers: {
              "Content-Type": "application/json",
            },
          });
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
    // item contains display_name, lat, lon, address object
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
      {provider === "nominatim" ? (
        <div className="relative">
          <input
            value={typeof value === "string" ? value : (value && (value as AddressResult).formattedAddress) || ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v);
              doNominatimSearch(v);
            }}
            onFocus={(e) => {
              const v = (typeof value === "string" ? value : (value && (value as AddressResult).formattedAddress) || "") as string;
              if (v && v.length >= 3) doNominatimSearch(v);
            }}
            placeholder={placeholder}
            className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            required={required}
          />
          <button
            type="button"
            onClick={handleCurrentLocation}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
            title="Usar mi ubicación actual"
          >
            {isLocating ? (
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            ) : (
              <MapPinIcon className="h-5 w-5" />
            )}
          </button>

          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-40 left-0 right-0 bg-white border border-slate-200 rounded mt-1 max-h-56 overflow-auto">
              {suggestions.map((s, idx) => (
                <li
                  key={s.place_id || s.osm_id || idx}
                  className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                  onMouseDown={(e) => {
                    // prevent blur before click
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
      ) : !fallback ? (
        <div className="relative">
          <input
            ref={ref}
            value={typeof value === "string" ? value : (value && (value as AddressResult).formattedAddress) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            required={required}
          />
          <button
            type="button"
            onClick={handleCurrentLocation}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
            title="Usar mi ubicación actual"
          >
            {isLocating ? (
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            ) : (
              <MapPinIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            value={typeof value === "string" ? value : (value && (value as AddressResult).formattedAddress) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder + " (autocomplete no disponible)"}
            className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            required={required}
          />
          <button
            type="button"
            onClick={handleCurrentLocation}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
            title="Usar mi ubicación actual"
          >
            {isLocating ? (
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            ) : (
              <MapPinIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      )}
      {/* Debug Panel removed for production */}
    </div>
  );
}
