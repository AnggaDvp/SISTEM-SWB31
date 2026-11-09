import CustomerForm from "@/components/CustomerForm";

export default function InputPage() {
  return (
    <div className="narrow">
      <div className="card">
        <h1>INPUT DATA</h1>
        <CustomerForm mode="create" />
      </div>
    </div>
  );
}
