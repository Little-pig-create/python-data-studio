import { CountUp } from "../ui-react-bits";

export function StatCard({ icon: Icon, label, value, color }) {
  return <div className="stat-card"><span className="stat-card-icon" style={{ backgroundColor: color }}><Icon /></span><div className="stat-card-body"><span className="stat-card-value"><CountUp to={value} /></span><span className="stat-card-label">{label}</span></div></div>;
}
