import { Router } from "express";
import { validate } from "../../middleware/validate.middleware.js";
import { getCitiesByCountryIdSchema } from "./place.validator.js";
import placeController from './place.controller.js';

const router = Router();

router.get("/countries", placeController.getCountries);
router.get("/regions", placeController.getRegions);
router.get("/cities", placeController.getCities);
router.get("/cities/:countryId", validate(getCitiesByCountryIdSchema), placeController.getCitiesByCountryId);

export { router as placeRouter };
