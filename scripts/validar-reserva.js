const { Reserva } = require("../src/modelos/reservas");

async function main() {
  const reserva = new Reserva({
    estudiante: "Martín Gómez",
    email: "martin.gomez@universidad.edu.ar",
    sala: "Sala Norte",
    fecha: "2026-10-25",
    turno: "Mañana",
    personas: 3,
  });

  await reserva.validate();
  console.log("Datos válidos; todavía no guardamos en MongoDB.");
}

main().catch((error) => {
  console.error("Validación rechazada:", error.name);

  if (error.errors) {
    console.error("Campos a revisar:", Object.keys(error.errors).join(", "));
  }

  process.exitCode = 1;
});
