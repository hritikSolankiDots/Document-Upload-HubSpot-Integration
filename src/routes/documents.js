import express from "express";
import {
  showUploadPage,
  handleDocumentUpload,
} from "../controllers/documentsController.js";
import { upload } from "../utils/multerConfig.js";

const router = express.Router();

// GET home page
router.get("/", (req, res) => {
  res.render("home");
});

// When someone GETs /upload-documents?data=...
router.get("/upload-documents", showUploadPage);
router.post("/upload-documents", upload, handleDocumentUpload);

export default router;
