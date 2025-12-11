export async function GET() {
  
  const telemetry = {battery:99, feederName:"Awesome feeder", activeAnimal: false, food: 80};


  return Response.json(telemetry)
}


export async function POST() {
  
  const telemetry = {battery:99, feederName:"Awesome feeder", activeAnimal: false};


  return Response.json(telemetry)
}


