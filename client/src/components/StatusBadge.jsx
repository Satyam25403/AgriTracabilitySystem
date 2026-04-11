/**
 * StatusBadge — colored pill for batch/shipment status
 *
 * Props:
 *   status  {string}  — any valid status value:
 *                       sourced | cleaning | grading | packaging |
 *                       warehoused | shipped | delivered |
 *                       pending | in_transit | delayed | cancelled |
 *                       low | expiring | ok
 *   label   {string}  — optional override text (defaults to status value)
 */
export default function StatusBadge({ status, label }) {
  return (
    <span className={`badge badge-${status}`}>
      {label || status}
    </span>
  );
}