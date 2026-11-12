import { Router } from "express";

const routesExample = Router();

routesExample.get("/", (req, res) => {
  res.json({ message: "Routes example" });
});

export default routesExample;
