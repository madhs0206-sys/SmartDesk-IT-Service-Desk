
async function testTicket() {
  const response = await fetch("http://localhost:5000/api/tickets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Test IT Support Ticket",
      description: "Checking if SmartDesk saves tickets to MongoDB.",
      category: "Technical",
      priority: "P3",
      createdBy: "Test User",
    }),
  });

  const data = await response.json();
  console.log(data);
}

testTicket().catch(console.error);
