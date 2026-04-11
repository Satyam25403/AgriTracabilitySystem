import StatusBadge from "./StatusBadge";

/**
 * BatchTable — data table for a list of batches
 *
 * Props:
 *   batches       {Array}     — array of batch objects from API
 *   onQR          {Function}  — (batch) => void  — called when QR button clicked
 *   onDelete      {Function}  — (batchId) => void — called when delete clicked
 *   onRowClick    {Function}  — (batch) => void  — called when row is clicked (optional)
 *   showActions   {boolean}   — show QR / delete buttons (default true)
 *   canDelete     {boolean}   — show delete button (default false)
 *   compact       {boolean}   — smaller row style for use inside modals (default false)
 *   selectedId    {string}    — highlight this batch._id (for Processing page selector)
 */
export default function BatchTable({
  batches = [],
  onQR,
  onDelete,
  onRowClick,
  showActions = true,
  canDelete   = false,
  compact     = false,
  selectedId,
}) {
  if (batches.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⟐</div>
        <p>No batches found.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Batch ID</th>
            <th>Commodity</th>
            <th>Farmer</th>
            {!compact && <th>Location</th>}
            <th>Quantity</th>
            {!compact && <th>Harvest Date</th>}
            <th>Status</th>
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => (
            <tr
              key={b._id}
              onClick={() => onRowClick?.(b)}
              style={{
                cursor:     onRowClick ? "pointer" : "default",
                background: selectedId === b._id ? "var(--green-muted)" : undefined,
              }}
            >
              <td>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize:   "12px",
                    color:      "var(--green-primary)",
                  }}
                >
                  {b.batchId}
                </span>
              </td>

              <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                {b.commodityType}
              </td>

              <td>{b.farmerName}</td>

              {!compact && <td>{b.farmLocation}</td>}

              <td>
                {b.quantity} {b.unit}
              </td>

              {!compact && (
                <td>{new Date(b.harvestDate).toLocaleDateString()}</td>
              )}

              <td>
                <StatusBadge status={b.currentStatus} />
              </td>

              {showActions && (
                <td>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {b.qrCodeUrl && onQR && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => { e.stopPropagation(); onQR(b); }}
                      >
                        QR
                      </button>
                    )}
                    {canDelete && onDelete && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => { e.stopPropagation(); onDelete(b._id); }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}