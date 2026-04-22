import { useEffect, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import toast from "react-hot-toast";

const STAGES = ["cleaning", "grading", "packaging", "warehoused", "shipped", "delivered"];

const STAGE_ICONS = {
  sourced:    "🌾",
  cleaning:   "🧹",
  grading:    "⚖️",
  packaging:  "📦",
  warehoused: "🏭",
  shipped:    "🚛",
  delivered:  "✅",
};

const STAGE_LABELS = {
  sourced:    "Sourced at Farm",
  cleaning:   "Cleaning",
  grading:    "Grading",
  packaging:  "Packaging",
  warehoused: "Moved to Warehouse",
  shipped:    "Shipped",
  delivered:  "Delivered",
};

// ── What fields each stage collects ─────────────────────────────────────────
// Each entry: { key, label, type, placeholder, required, options }
const STAGE_FIELDS = {
  cleaning: [
    { key: "facilityName",   label: "Processing Facility",  type: "text",   placeholder: "Facility name", required: true },
    { key: "facilityCity",   label: "City / Location",      type: "text",   placeholder: "e.g. Kandy, Sri Lanka" },
    { key: "processDate",    label: "Processing Date",       type: "date",   required: true },
    { key: "quantityBefore", label: "Quantity Before (kg)",  type: "number", placeholder: "Input quantity" },
    { key: "quantityAfter",  label: "Quantity After (kg)",   type: "number", placeholder: "Output quantity", isQtyAfter: true },
    { key: "method",         label: "Cleaning Method",       type: "select",
      options: ["Washing & Drying", "Dry Sorting", "Air Classification", "Magnetic Separation", "Laser Optical Sorting", "Other"] },
    { key: "notes",          label: "Quality Observations",  type: "textarea", placeholder: "Moisture %, impurities removed, observations..." },
  ],
  grading: [
    { key: "facilityName",   label: "Grading Facility",     type: "text",   placeholder: "Facility name", required: true },
    { key: "facilityCity",   label: "City / Location",      type: "text",   placeholder: "e.g. Kandy, Sri Lanka" },
    { key: "gradeDate",      label: "Grading Date",         type: "date",   required: true },
    { key: "gradeAssigned",  label: "Grade Assigned",       type: "text",   placeholder: "e.g. G5, Grade A, Kera Grade, 120 ASTA" },
    { key: "gradingStandard",label: "Grading Standard",     type: "select",
      options: ["Internal QC", "AGMARK", "ISO 972 (Pepper)", "ASTA (Paprika/Chilli)", "FSSAI", "EU Regulation EC 396/2005", "Custom"] },
    { key: "quantityAfter",  label: "Quantity After (kg)",  type: "number", placeholder: "Quantity passing grade", isQtyAfter: true },
    { key: "rejectedQty",    label: "Rejected Quantity (kg)",type: "number", placeholder: "Quantity below grade" },
    { key: "notes",          label: "Grading Notes",        type: "textarea", placeholder: "Active content %, moisture, sensory assessment..." },
  ],
  packaging: [
    { key: "facilityName",   label: "Packaging Facility",   type: "text",   placeholder: "Facility name", required: true },
    { key: "facilityCity",   label: "City / Location",      type: "text",   placeholder: "e.g. Bengaluru, India" },
    { key: "packagingDate",  label: "Packaging Date",       type: "date",   required: true },
    { key: "packagingType",  label: "Packaging Format",     type: "select",
      options: ["25 kg HDPE Sack", "50 kg HDPE Sack", "500 kg FIBC Bulk Tote", "1000 kg FIBC Bulk Tote", "High-Capacity Drum", "Retail Pouch", "Composite Can", "Custom"] },
    { key: "unitCount",      label: "Number of Units",      type: "number", placeholder: "e.g. 192 bags" },
    { key: "quantityAfter",  label: "Total Quantity Packed (kg)", type: "number", placeholder: "Net packed weight", isQtyAfter: true },
    { key: "lotNumber",      label: "Lot / Batch Code",     type: "text",   placeholder: "Label code on packaging" },
    { key: "notes",          label: "Packaging Notes",      type: "textarea", placeholder: "Label compliance, packaging line, special handling..." },
  ],
  warehoused: [
    { key: "warehouseName",  label: "Warehouse Name",       type: "text",   placeholder: "e.g. Bengaluru Operations Hub", required: true },
    { key: "warehouseCity",  label: "City / Location",      type: "text",   placeholder: "e.g. Bengaluru, India" },
    { key: "dateReceived",   label: "Date Received",        type: "date",   required: true },
    { key: "quantityAfter",  label: "Quantity Received (kg)",type: "number", placeholder: "Verified received quantity", isQtyAfter: true },
    { key: "storageTemp",    label: "Storage Temperature",  type: "text",   placeholder: "e.g. 18°C ambient" },
    { key: "storageHumidity",label: "Humidity Condition",   type: "text",   placeholder: "e.g. <60% RH" },
    { key: "rackLocation",   label: "Rack / Bay Reference", type: "text",   placeholder: "e.g. Bay 3, Rack B" },
    { key: "notes",          label: "Warehouse Notes",      type: "textarea", placeholder: "Condition on arrival, pest control, remarks..." },
  ],
  shipped: [
    { key: "destination",     label: "Destination",          type: "text",   placeholder: "City, Country", required: true },
    { key: "dispatchDate",    label: "Dispatch Date",        type: "date",   required: true },
    { key: "expectedDelivery",label: "Expected Delivery",    type: "date",   required: true },
    { key: "transportMode",   label: "Transport Mode",       type: "select",
      options: ["Sea (FCL)", "Sea (LCL)", "Air Freight", "Road", "Rail", "Multimodal"] },
    { key: "vehicleRef",      label: "Vehicle / Container / Vessel",type: "text", placeholder: "e.g. CTIU3456789 / Flight TK701" },
    { key: "driverCarrier",   label: "Driver / Carrier Name",type: "text",   placeholder: "e.g. Maersk / Ahmed Al Farsi" },
    { key: "quantityAfter",   label: "Quantity Shipped (kg)", type: "number", placeholder: "Net shipped weight", isQtyAfter: true },
    { key: "notes",           label: "Shipping Notes",       type: "textarea", placeholder: "Port of loading, Incoterms, documents issued..." },
  ],
  delivered: [
    { key: "destination",     label: "Delivery Address",     type: "text",   placeholder: "Full address or city, country", required: true },
    { key: "deliveryDate",    label: "Actual Delivery Date", type: "date",   required: true },
    { key: "recipientName",   label: "Recipient Name",       type: "text",   placeholder: "Person who received the shipment" },
    { key: "recipientCompany",label: "Recipient Company",    type: "text",   placeholder: "e.g. Spice Masters BV" },
    { key: "quantityAfter",   label: "Quantity Delivered (kg)", type: "number", placeholder: "Verified delivered quantity", isQtyAfter: true },
    { key: "conditionOnArrival", label: "Condition on Arrival", type: "select",
      options: ["Good — meets spec", "Minor damage — within tolerance", "Partial loss — claim raised", "Rejected — returned"] },
    { key: "notes",           label: "Delivery Notes",       type: "textarea", placeholder: "POD number, client remarks, discrepancies..." },
  ],
};

// ── Stage-specific timeline detail renderer ──────────────────────────────────
function StageDetail({ log }) {
  const d = log.stageData || {};
  const rows = [];

  const push = (label, value) => {
    if (value !== undefined && value !== null && value !== "") rows.push({ label, value });
  };

  switch (log.stage) {
    case "cleaning":
      push("Facility",          d.facilityName && d.facilityCity ? `${d.facilityName}, ${d.facilityCity}` : d.facilityName || d.facilityCity);
      push("Method",            d.method);
      push("Qty Before",        d.quantityBefore ? `${d.quantityBefore} kg` : null);
      push("Qty After",         log.quantityAfter ? `${log.quantityAfter} kg` : null);
      break;
    case "grading":
      push("Facility",          d.facilityName && d.facilityCity ? `${d.facilityName}, ${d.facilityCity}` : d.facilityName || d.facilityCity);
      push("Grade",             d.gradeAssigned);
      push("Standard",          d.gradingStandard);
      push("Qty Passed",        log.quantityAfter ? `${log.quantityAfter} kg` : null);
      push("Qty Rejected",      d.rejectedQty ? `${d.rejectedQty} kg` : null);
      break;
    case "packaging":
      push("Facility",          d.facilityName && d.facilityCity ? `${d.facilityName}, ${d.facilityCity}` : d.facilityName || d.facilityCity);
      push("Format",            d.packagingType);
      push("Units",             d.unitCount ? `${d.unitCount} units` : null);
      push("Lot Code",          d.lotNumber);
      push("Total Packed",      log.quantityAfter ? `${log.quantityAfter} kg` : null);
      break;
    case "warehoused":
      push("Warehouse",         d.warehouseName && d.warehouseCity ? `${d.warehouseName}, ${d.warehouseCity}` : d.warehouseName || d.warehouseCity || log.location);
      push("Qty Received",      log.quantityAfter ? `${log.quantityAfter} kg` : null);
      push("Temperature",       d.storageTemp);
      push("Humidity",          d.storageHumidity);
      push("Rack / Bay",        d.rackLocation);
      break;
    case "shipped":
      push("Destination",       d.destination || log.location);
      push("Dispatch Date",     d.dispatchDate ? new Date(d.dispatchDate).toLocaleDateString() : null);
      push("Expected Delivery", d.expectedDelivery ? new Date(d.expectedDelivery).toLocaleDateString() : null);
      push("Mode",              d.transportMode);
      push("Container / Ref",   d.vehicleRef);
      push("Carrier",           d.driverCarrier);
      push("Qty Shipped",       log.quantityAfter ? `${log.quantityAfter} kg` : null);
      break;
    case "delivered":
      push("Delivered To",      d.recipientCompany ? `${d.recipientName || ""} — ${d.recipientCompany}` : d.recipientName);
      push("Address",           d.destination || log.location);
      push("Delivery Date",     d.deliveryDate ? new Date(d.deliveryDate).toLocaleDateString() : null);
      push("Qty Delivered",     log.quantityAfter ? `${log.quantityAfter} kg` : null);
      push("Condition",         d.conditionOnArrival);
      break;
    default:
      push("Location",          log.location);
      push("Quantity",          log.quantityAfter ? `${log.quantityAfter} kg` : null);
  }

  if (!rows.length && !log.notes) return null;

  return (
    <div style={{ marginTop: 6 }}>
      {rows.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", marginBottom: log.notes ? 6 : 0 }}>
          {rows.map(({ label, value }) => value ? (
            <span key={label} style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{label}:</span> {value}
            </span>
          ) : null)}
        </div>
      )}
      {log.notes && (
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic" }}>
          {log.notes}
        </div>
      )}
    </div>
  );
}

// ── Stage-specific form fields renderer ─────────────────────────────────────
function StageForm({ stage, stageData, onChange }) {
  const fields = STAGE_FIELDS[stage] || [];

  const handleChange = (key, value) => {
    onChange({ ...stageData, [key]: value });
  };

  if (!fields.length) return null;

  return (
    <div>
      <p style={{
        fontSize: "11px", fontWeight: 700, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.09em",
        margin: "4px 0 14px",
        paddingTop: 14, borderTop: "1px solid var(--border)",
      }}>
        {STAGE_LABELS[stage]} Details
      </p>
      <div className="grid-2">
        {fields.map((field) => {
          if (field.isQtyAfter) return null; // handled separately as quantityAfter
          return (
            <div
              key={field.key}
              className="form-group"
              style={{ gridColumn: field.type === "textarea" ? "1/-1" : undefined, marginBottom: 14 }}
            >
              <label className="form-label">
                {field.label}{field.required && " *"}
              </label>

              {field.type === "select" ? (
                <select
                  className="form-control"
                  value={stageData[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                >
                  <option value="">— Select —</option>
                  {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  className="form-control"
                  style={{ minHeight: 70, resize: "vertical" }}
                  placeholder={field.placeholder}
                  value={stageData[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              ) : (
                <input
                  className="form-control"
                  type={field.type}
                  placeholder={field.placeholder}
                  value={stageData[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Processing() {
  const { can } = useAuth();
  const [batches, setBatches]         = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [logs, setLogs]               = useState([]);
  const [showModal, setShowModal]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // form state
  const [batchId, setBatchId]         = useState("");
  const [stage, setStage]             = useState("cleaning");
  const [quantityAfter, setQtyAfter]  = useState("");
  const [stageData, setStageData]     = useState({});

  // The quantity-after field definition for current stage
  const qtyField = (STAGE_FIELDS[stage] || []).find((f) => f.isQtyAfter);

  const openModal = () => {
    setBatchId(selectedBatch?._id || "");
    setStage("cleaning");
    setQtyAfter("");
    setStageData({});
    setShowModal(true);
  };

  useEffect(() => {
    api.get("/batches").then((r) => setBatches(r.data.batches)).catch(() => {});
  }, []);

  const selectBatch = async (batch) => {
    setSelectedBatch(batch);
    setBatchId(batch._id);
    setLoadingLogs(true);
    try {
      const res = await api.get(`/processing/${batch._id}`);
      setLogs(res.data.logs);
    } catch { setLogs([]); }
    finally { setLoadingLogs(false); }
  };

  const submit = async () => {
    if (!batchId || !stage) return toast.error("Select a batch and stage");

    // Validate required stage-specific fields
    const fields = STAGE_FIELDS[stage] || [];
    const missing = fields.filter((f) => f.required && !f.isQtyAfter && !stageData[f.key]);
    if (missing.length) return toast.error(`Required: ${missing.map((f) => f.label).join(", ")}`);

    setSaving(true);
    try {
      await api.post("/processing", {
        batchId,
        stage,
        quantityAfter: quantityAfter ? Number(quantityAfter) : undefined,
        stageData,
        // pull notes from stageData.notes if present
        notes: stageData.notes || undefined,
      });
      toast.success(`Stage logged: ${STAGE_LABELS[stage]}`);
      setShowModal(false);
      const b = batches.find((x) => x._id === batchId);
      if (b) selectBatch(b);
      api.get("/batches").then((r) => setBatches(r.data.batches));
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to log stage");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Processing Tracker</h2>
          <p className="page-subtitle">Log and monitor batch lifecycle stages</p>
        </div>
        {can("admin", "processor", "warehouse", "dispatcher") && (
          <button className="btn btn-primary" onClick={openModal}>+ Log Stage</button>
        )}
      </div>

      <div className="grid-2">
        {/* ── Batch Selector ── */}
        <div className="card">
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "12px", color: "var(--text-muted)", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Select Batch
          </h3>
          {batches.length === 0 ? (
            <div className="empty-state"><p>No batches available</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 520, overflowY: "auto" }}>
              {batches.map((b) => (
                <div
                  key={b._id}
                  onClick={() => selectBatch(b)}
                  style={{
                    padding: "11px 14px",
                    background: selectedBatch?._id === b._id ? "var(--forest-wash)" : "var(--bg-primary)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    border: `1px solid ${selectedBatch?._id === b._id ? "var(--forest-light)" : "var(--border)"}`,
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "12px", fontWeight: 700, color: "var(--forest)" }}>{b.batchId}</div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)", marginTop: 2 }}>
                    {b.commodityType}
                    {b.isMultiOrigin
                      ? <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: 6 }}>multi-origin</span>
                      : b.farmerName ? <span style={{ color: "var(--text-muted)" }}> — {b.farmerName}</span> : null
                    }
                  </div>
                  <div style={{ marginTop: 6 }}><StatusBadge status={b.currentStatus} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Timeline ── */}
        <div className="card">
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "12px", color: "var(--text-muted)", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {selectedBatch ? `Timeline — ${selectedBatch.batchId}` : "Select a Batch"}
          </h3>

          {!selectedBatch ? (
            <div className="empty-state"><div className="empty-icon">⟳</div><p>Select a batch to view its timeline</p></div>
          ) : loadingLogs ? (
            <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : (
            <div>
              {[
                {
                  stage: "sourced",
                  timestamp: selectedBatch.createdAt,
                  operatorName: selectedBatch.createdBy?.name || "System",
                  notes: selectedBatch.isMultiOrigin
                    ? `Multi-origin: ${selectedBatch.origins?.length || 0} origins, ${selectedBatch.quantity} ${selectedBatch.unit}`
                    : `${selectedBatch.quantity} ${selectedBatch.unit} harvested`,
                  location: selectedBatch.farmLocation,
                  stageData: {},
                },
                ...logs,
              ].map((log, i, arr) => (
                <div key={i} style={{ display: "flex", gap: 14 }}>
                  {/* dot + line */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: "var(--forest-wash)", border: "2px solid var(--forest-light)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                    }}>
                      {STAGE_ICONS[log.stage] || "●"}
                    </div>
                    {i < arr.length - 1 && (
                      <div style={{ width: 2, flex: 1, minHeight: 20, background: "var(--border)", margin: "3px 0" }} />
                    )}
                  </div>

                  {/* content */}
                  <div style={{ paddingBottom: 20, flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 4 }}>
                      <StatusBadge status={log.stage} />
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <StageDetail log={log} />
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 4 }}>
                      logged by {log.operatorName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Log Stage Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: 580 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Log Stage Update</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            {/* Batch selector */}
            <div className="form-group">
              <label className="form-label">Batch *</label>
              <select
                className="form-control"
                value={batchId}
                onChange={(e) => {
                  setBatchId(e.target.value);
                  const b = batches.find((x) => x._id === e.target.value);
                  if (b) selectBatch(b);
                }}
              >
                <option value="">— Select batch —</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.batchId} — {b.commodityType} ({b.currentStatus})
                  </option>
                ))}
              </select>
            </div>

            {/* Stage selector */}
            <div className="form-group">
              <label className="form-label">Stage *</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setStage(s); setStageData({}); setQtyAfter(""); }}
                    style={{
                      padding: "8px 6px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                      fontFamily: "var(--font-body)",
                      textAlign: "center",
                      transition: "all 0.15s",
                      background:   stage === s ? "var(--forest)"      : "var(--bg-card)",
                      color:        stage === s ? "#d4e8c4"             : "var(--text-secondary)",
                      borderColor:  stage === s ? "var(--forest)"      : "var(--border)",
                    }}
                  >
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{STAGE_ICONS[s]}</div>
                    <div style={{ textTransform: "capitalize" }}>{s}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity after — always shown but with stage-specific label */}
            {qtyField && (
              <div className="form-group">
                <label className="form-label">{qtyField.label}</label>
                <input
                  className="form-control"
                  type="number"
                  placeholder={qtyField.placeholder}
                  value={quantityAfter}
                  onChange={(e) => setQtyAfter(e.target.value)}
                />
              </div>
            )}

            {/* Stage-specific fields */}
            <StageForm
              stage={stage}
              stageData={stageData}
              onChange={setStageData}
            />

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>
                {saving ? "Saving..." : `Log ${STAGE_LABELS[stage]}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}