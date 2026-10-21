const {
  conectarBaseDatos,
  desconectarBaseDatos,
} = require("../src/config/base-datos");

async function main() {
  try {
    await conectarBaseDatos();
    console.log("Conexión con MongoDB establecida.");
  } finally {
    await desconectarBaseDatos();
  }
}

main().catch((error) => {
  console.error("No se pudo completar la conexión:", error.name);
  const codigosDns = [
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEOUT",
    "ESERVFAIL",
    "EAI_AGAIN",
  ];

  if (codigosDns.includes(error.code)) {
    console.error("Código DNS/red:", error.code);
  }
  if (error.syscall === "querySrv" || error.syscall === "queryTxt") {
    console.error("Consulta DNS:", error.syscall);
  }

  console.error("Revisar MONGODB_URI, servidor, red y permisos.");
  process.exitCode = 1;
});
