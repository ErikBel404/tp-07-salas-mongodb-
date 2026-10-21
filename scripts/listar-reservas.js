const {
  conectarBaseDatos,
  desconectarBaseDatos,
} = require("./../src/config/base-datos");

const { Reserva } = require("./../src/modelos/reservas");

async function main() {
  try {
    await conectarBaseDatos();

    const reservas = await Reserva.find({});

    console.table(
      reservas.map((reserva) => ({
        id: reserva._id.toString(),
        estudiante: reserva.estudiante,
        email: reserva.email,
        sala: reserva.sala,
        fecha: reserva.fecha,
        turno: reserva.turno,
        personas: reserva.personas,
      })),
    );

    console.log("Total de reservas:", reservas.length);
  } finally {
    await desconectarBaseDatos();
  }
}

main().catch((error) => {
  console.error("No se pudo consultar las reservas:", error.name);
  console.error("Revisar configuración y disponibilidad de MongoDB.");
  process.exitCode = 1;
});
