import Individual from '../models/Individual.js';
import Institution from '../models/Institution.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Register Individual
export const registerIndividual = async (req, res) => {
  try {
    const { name, email, password, college, year, department } = req.body;
    console.log('Register req.body:', req.body); // Debug log

    // Validate required fields
    if (!name || !email || !password || !college || !year || !department) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await Individual.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    // Validate college ID
    const institution = await Institution.findById(college);
    if (!institution) return res.status(400).json({ message: 'Invalid college ID' });

    // Validate file
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: 'Resume file is required' });
    }
    console.log('Register req.file:', req.file); // Debug log
    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.log('File buffer is empty');
      return res.status(400).json({ message: 'Uploaded file is empty' });
    }
    if (req.file.mimetype !== 'application/pdf') {
      console.log('Invalid file type:', req.file.mimetype);
      return res.status(400).json({ message: 'Only PDF files are allowed' });
    }
    if (req.file.size > 5 * 1024 * 1024) { // 5MB limit
      console.log('File too large:', req.file.size);
      return res.status(400).json({ message: 'File size exceeds 5MB limit' });
    }

    // Upload to Cloudinary
    let result;
    try {
      result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'resumes',
            public_id: `${name}_${Date.now()}`,
            resource_type: 'auto'
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        stream.end(req.file.buffer);
      });
    } catch (uploadError) {
      console.error('Cloudinary upload failed:', uploadError.message);
      return res.status(500).json({ message: 'Failed to upload resume to Cloudinary', error: uploadError.message });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new Individual({
      name,
      email,
      password: hashedPassword,
      college,
      year,
      department,
      resumeFilePath: result.secure_url
    });

    await newUser.save();
    res.status(201).json({
      message: 'User registered successfully',
      user: { name, email, college, year, department, resumeFilePath: newUser.resumeFilePath }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// Login Individual
export const loginIndividual = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Individual.findOne({ email }).populate('college', 'name');
    if (!user) return res.status(400).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        college: user.college ? user.college.name : null,
        year: user.year,
        department: user.department,
        resumeFilePath: user.resumeFilePath
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// Helper to check if path is a URL
function isUrl(str) {
  return /^https?:\/\//.test(str);
}

// Helper to get public_id from Cloudinary URL
function getCloudinaryPublicId(url) {
  // Example: https://res.cloudinary.com/<cloud_name>/.../resumes/filename_timestamp.pdf
  // You want: resumes/filename_timestamp (without extension)
  const matches = url.match(/\/resumes\/([^\.\/]+)(?:\.[a-zA-Z0-9]+)?/);
  if (matches) {
    return `resumes/${matches[1]}`;
  }
  return null;
}

// Upload PDF
export const uploadPDF = async (req, res) => {
  try {
      const { id } = req.params;
      if (req.user.id.toString() !== id.toString()) {
          return res.status(403).json({ message: "Unauthorized" });
      }

      const user = await Individual.findById(id);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
      }

      if (user.resumeFilePath) {
          if (isUrl(user.resumeFilePath)) {
              // Delete from Cloudinary
              const publicId = getCloudinaryPublicId(user.resumeFilePath);
              if (publicId) {
                  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
                  console.log(`Deleted previous resume from Cloudinary: ${publicId}`);
              }
          } else if (fs.existsSync(user.resumeFilePath)) {
              fs.unlinkSync(user.resumeFilePath);
              console.log(`Deleted previous resume: ${user.resumeFilePath}`);
          }
      }

      // Upload to Cloudinary
      let result;
      try {
        result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'resumes',
              public_id: `${user.name}_${Date.now()}`,
              resource_type: 'auto'
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          stream.end(req.file.buffer);
        });
      } catch (uploadError) {
        console.error('Cloudinary upload failed:', uploadError.message);
        return res.status(500).json({ message: 'Failed to upload resume to Cloudinary', error: uploadError.message });
      }

      user.resumeFilePath = result.secure_url;
      await user.save();

      res.status(200).json({ message: "PDF uploaded successfully", filePath: result.secure_url });
  } catch (error) {
      console.error("Upload Error:", error.message);
      if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: error.message });
  }
};

// Delete PDF
export const deletePDF = async (req, res) => {
  try {
      const { id } = req.params;
      if (req.user.id.toString() !== id.toString()) {
          return res.status(403).json({ message: "Unauthorized" });
      }

      const user = await Individual.findById(id);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.resumeFilePath) {
          if (isUrl(user.resumeFilePath)) {
              // Delete from Cloudinary
              const publicId = getCloudinaryPublicId(user.resumeFilePath);
              if (publicId) {
                  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
                  console.log(`Deleted previous resume from Cloudinary: ${publicId}`);
              }
          } else if (fs.existsSync(user.resumeFilePath)) {
              fs.unlinkSync(user.resumeFilePath);
              console.log(`Deleted previous resume: ${user.resumeFilePath}`);
          }
      }

      user.resumeFilePath = null;
      await user.save();

      res.status(200).json({ message: "PDF deleted successfully" });
  } catch (error) {
      console.error("Delete Error:", error.message);
      res.status(500).json({ message: error.message });
  }
};

export const uploadAnalysisReport = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id.toString() !== id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const user = await Individual.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Delete previous analysis report from Cloudinary if it exists
    if (user.analysisFilePath) {
      const publicId = getCloudinaryPublicId(user.analysisFilePath);
      if (publicId) {
        await cloudinary.uploader.destroy(`analysis_reports/${publicId}`, { resource_type: 'raw' });
        console.log(`Deleted previous analysis report from Cloudinary: ${publicId}`);
      }
    }
    console.log('Received FormData:', {
        analysisResumeScore: req.body.analysisResumeScore,
        analysisAtsScore: req.body.analysisAtsScore,
        jobRole: req.body.jobRole,
        jobCategory: req.body.jobCategory,
        file: req.file.originalname,
      });

    // Upload new report to Cloudinary
    let result;
    try {
      result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'analysis_reports',
            public_id: `${user.name.replace(/\s+/g, '_')}_report_${Date.now()}`,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        stream.end(req.file.buffer);
      });
    } catch (uploadError) {
      console.error('Cloudinary upload failed:', uploadError.message);
      return res.status(500).json({
        message: 'Failed to upload report to Cloudinary',
        error: uploadError.message,
      });
    }

    // Update user document with analysis details
    user.analysisFilePath = result.secure_url;
    user.analysisResumeScore = parseInt(req.body.analysisResumeScore, 10) || 0;
    user.analysisAtsScore = parseInt(req.body.analysisAtsScore, 10) || 0;
    user.jobRole = req.body.jobRole || user.jobRole || '';
    user.jobCategory = req.body.jobCategory || user.jobCategory || '';

    // Explicitly unset legacy fields if they exist
    user.atsScore = undefined;
    user.reportFilePath = undefined;

    await user.save();

    // Clean up temporary file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(200).json({
      message: 'Analysis report uploaded successfully',
      filePath: result.secure_url,
      analysisResumeScore: user.analysisResumeScore,
      analysisAtsScore: user.analysisAtsScore,
      jobRole: user.jobRole,
      jobCategory: user.jobCategory,
    });
  } catch (error) {
    console.error('Upload Error:', error.message);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message || 'Unknown error' 
    });
  }
};