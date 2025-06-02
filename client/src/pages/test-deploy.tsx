export default function TestDeploy() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-green-800 mb-4">
          DEPLOYMENT TEST - NEW FILE CREATED
        </h1>
        <p className="text-lg text-green-600">
          If you can see this page, the deployment system is working.
        </p>
        <p className="text-sm text-green-500 mt-4">
          Created at: {new Date().toISOString()}
        </p>
      </div>
    </div>
  );
}