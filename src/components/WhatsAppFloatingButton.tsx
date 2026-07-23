import * as React from "react";
import { MessageCircle } from "lucide-react";

export function WhatsAppFloatingButton() {
  const phoneNumber = "918866377722";
  const formattedPhone = "+91 88663 77722";
  const defaultMessage = encodeURIComponent(
    "Hello 1stCars! I would like to inquire about buying or selling a car."
  );

  const handleClick = () => {
    window.open(`https://wa.me/${phoneNumber}?text=${defaultMessage}`, "_blank");
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center group select-none">
      {/* Tooltip / Label on Hover on Desktop */}
      <div className="hidden sm:flex items-center mr-2 px-3 py-1.5 bg-slate-900/90 text-white text-xs font-bold rounded-xl backdrop-blur-md shadow-xl border border-white/10 opacity-90 group-hover:opacity-100 transition-all duration-300 transform group-hover:-translate-x-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#25D366] animate-ping" />
          Chat on WhatsApp: <strong className="text-[#25D366] font-extrabold">{formattedPhone}</strong>
        </span>
      </div>

      {/* Main WhatsApp Floating Circle Button */}
      <button
        onClick={handleClick}
        aria-label="Contact on WhatsApp +91 88663 77722"
        className="relative bg-[#25D366] hover:bg-[#20ba5a] text-white p-3.5 sm:p-4 rounded-full shadow-2xl shadow-[#25D366]/40 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center border-2 border-white/30 group"
      >
        {/* Pulsing Outer Glow */}
        <span className="absolute -inset-1 rounded-full bg-[#25D366]/30 animate-pulse pointer-events-none" />

        {/* Custom WhatsApp SVG Icon */}
        <svg
          className="w-6 h-6 sm:w-7 sm:h-7 fill-current relative z-10"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.119.553 4.11 1.519 5.842L0 24l6.338-1.5A11.936 11.936 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.821 0-3.535-.486-5.021-1.332l-.36-.204-3.729.883.993-3.633-.231-.371A9.957 9.957 0 012 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z" />
        </svg>
      </button>
    </div>
  );
}
