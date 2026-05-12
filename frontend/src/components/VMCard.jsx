import { Card } from 'antd'

export default function VMCard({ vm }) {
  return (
    <Card title={vm.name}>
      Status: {vm.status}
    </Card>
  )
}