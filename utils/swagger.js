import swaggerJSDoc from "swagger-jsdoc";
import path from "path";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Skill Swap Project API",
      version: "1.0.1",
      description: `API documentation for Skill Swap Project (Updated: ${new Date().toISOString()})`,
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local server",
      },
      {
        url: "https://skill-swaapp.vercel.app/",
        description: "Production server",
      },
      {
        url: "https://skill-swap-api-psi.vercel.app/",
        description: "Alternative Production server",
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: [
    path.join(process.cwd(), "Src/modules/**/*.router.js"),
  ],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
