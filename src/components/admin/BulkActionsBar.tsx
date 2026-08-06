import { ArrowDownToLine, ArrowUpFromLine, Sparkles } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

type ExportableModule = "cars" | "brands" | "test_drive_requests" | "booking_requests" | "seller_enquiries" | "dealers";
type ImportableModule = "cars" | "brands" | "test_drive_requests" | "booking_requests";

const EXPORTABLE: ExportableModule[] = ["cars", "brands", "test_drive_requests", "booking_requests", "seller_enquiries", "dealers"];
const IMPORTABLE: ImportableModule[] = ["cars", "brands", "test_drive_requests", "booking_requests"];

interface BulkActionsBarProps {
  activeModule: string;
  onExport: (module: string) => void;
  onImport: (module: ImportableModule, event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BulkActionsBar({ activeModule, onExport, onImport }: BulkActionsBarProps) {
  if (!EXPORTABLE.includes(activeModule as ExportableModule)) return null;

  const title =
    activeModule === "test_drive_requests"
      ? "Test Drive Requests Management & Download Sheet"
      : activeModule === "booking_requests"
      ? "Booking Requests Management & Download Sheet"
      : activeModule === "seller_enquiries"
      ? "Seller Enquiries Management & Download Sheet"
      : activeModule === "dealers"
      ? "Dealer Verification & Application Manager"
      : `Bulk spreadsheet ${activeModule} catalog manager`;

  const desc =
    activeModule === "test_drive_requests"
      ? "Download all priority test drive bookings in a dedicated Excel/CSV sheet"
      : activeModule === "booking_requests"
      ? "Download all buy car / reservation requests in a dedicated Excel/CSV sheet"
      : activeModule === "seller_enquiries"
      ? "Download all car valuation and evaluation requests in a separate Excel/CSV sheet"
      : activeModule === "dealers"
      ? "Review submitted Visiting Cards and Aadhar Cards to approve dealers for live vehicle auctions"
      : "Download current catalog as Excel .xls or upload bulk new listings";

  const downloadLabel =
    activeModule === "test_drive_requests"
      ? "Test Drive Sheet (.XLS)"
      : activeModule === "booking_requests"
      ? "Booking Sheet (.XLS)"
      : activeModule === "seller_enquiries"
      ? "Seller Sheet (.XLS)"
      : activeModule === "dealers"
      ? "Dealer Applications (.XLS)"
      : "Catalog XLS";

  const uploadLabel =
    activeModule === "test_drive_requests"
      ? "Test Drive XLS"
      : activeModule === "booking_requests"
      ? "Booking XLS"
      : "Bulk XLS";

  return (
    <div className="p-4 bg-emerald-50/60 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-left">
        <h4 className="font-black text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-emerald-700 shrink-0" />
          {title}
        </h4>
        <p className="text-[10px] text-emerald-800/80 font-bold uppercase tracking-widest mt-1">{desc}</p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          onClick={() => onExport(activeModule)}
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-black uppercase tracking-wider h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" /> Download {downloadLabel}
        </Button>
        {IMPORTABLE.includes(activeModule as ImportableModule) && (
          <div className="relative">
            <input
              type="file"
              id="bulk-xls-uploader"
              accept=".xls,.xlsx,.csv"
              onChange={(e) => onImport(activeModule as ImportableModule, e)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
            <Button
              variant="secondary"
              className="bg-white border border-emerald-200 text-emerald-900 text-[10px] font-black uppercase tracking-wider h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <ArrowUpFromLine className="h-3.5 w-3.5" /> Upload {uploadLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
