// src/pages/psychic/PsychicRegister.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePsychicAuth } from "@/context/PsychicAuthContext";
import { 
  Loader2, Upload, X, Sparkles, UserPlus, Mail, Lock, 
  User, Award, Globe, Shield, BookOpen, Star,
  Heart, Briefcase, Moon, Sun, Compass, Sparkle, Brain,
  Eye, Cloud, MapPin, Calendar, Layers, Hash
} from "lucide-react";
import { toast } from "sonner";

// Define the same color scheme
const colors = {
  primary: "#2B1B3F",      // Deep purple
  secondary: "#C9A24D",    // Antique gold
  accent: "#9B7EDE",       // Light purple
  bgLight: "#3A2B4F",      // Lighter purple
  textLight: "#E8D9B0",    // Light gold text
  success: "#10B981",      // Green
  warning: "#F59E0B",      // Yellow
  danger: "#EF4444",       // Red
  background: "#F5F3EB",   // Soft ivory
};

// Define psychic categories with icons
const psychicCategories = [
  { value: "Tarot Reading", label: "Tarot Reading", icon: <Sparkle className="h-4 w-4" /> },
  { value: "Astrology", label: "Astrology", icon: <Moon className="h-4 w-4" /> },
  { value: "Reading", label: "Spiritual Reading", icon: <BookOpen className="h-4 w-4" /> },
  { value: "Love & Relationships", label: "Love & Relationships", icon: <Heart className="h-4 w-4" /> },
  { value: "Career & Finance", label: "Career & Finance", icon: <Briefcase className="h-4 w-4" /> },
  { value: "Spiritual Guidance", label: "Spiritual Guidance", icon: <Compass className="h-4 w-4" /> },
  { value: "Numerology", label: "Numerology", icon: <Brain className="h-4 w-4" /> },
  { value: "Clairvoyant", label: "Clairvoyance", icon: <Eye className="h-4 w-4" /> },
  { value: "Dream Analysis", label: "Dream Analysis", icon: <Cloud className="h-4 w-4" /> },
];

export default function PsychicRegister() {
  const { register, loading } = usePsychicAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    bio: "",
    gender: "",
    category: "",
    abilities: "",           // Added missing field
    location: "",            // Added missing field
    languages: "English",   // Added missing field (default)
    experience: "",          // Added missing field
    specialization: "",      // Added missing field
    image: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleGenderChange = (value) => {
    setFormData({ ...formData, gender: value });
  };

  const handleCategoryChange = (value) => {
    setFormData({ ...formData, category: value });
  };

  // Cloudinary upload function
  const uploadToCloudinary = async (file) => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "ml_default");
    
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dovyqaltq/image/upload", {
        method: "POST",
        body: data,
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Upload failed");
      return json.secure_url;
    } catch (error) {
      toast.error("Image upload failed: " + error.message);
      throw error;
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file (JPG, PNG, GIF)");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5 MB");
        return;
      }
      
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setFormData(prev => ({ ...prev, image: "" }));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!formData.gender) {
      toast.error("Please select your gender");
      return;
    }

    if (!formData.category) {
      toast.error("Please select your main category");
      return;
    }

    try {
      let finalImageUrl = formData.image;
      
      if (imageFile) {
        setIsUploadingImage(true);
        finalImageUrl = await uploadToCloudinary(imageFile);
        setIsUploadingImage(false);
      }

      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        bio: formData.bio,
        gender: formData.gender,
        category: formData.category,
        abilities: formData.abilities,                 // Add abilities
        location: formData.location,                    // Add location
        languages: formData.languages,                  // Add languages
        experience: formData.experience,                // Add experience
        specialization: formData.specialization,        // Add specialization
        image: finalImageUrl
      };

      const result = await register(registrationData);

      if (result?.success) {
        toast.success("Application submitted successfully! Awaiting administrator approval.", {
          duration: 5000,
          action: {
            label: "Sign in",
            onClick: () => navigate("/psychic/login"),
          },
        });
        setTimeout(() => {
          navigate("/psychic/login");
        }, 3000);
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: colors.background }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 h-40 w-40 rounded-full" 
          style={{ backgroundColor: colors.accent, filter: 'blur(60px)' }}></div>
        <div className="absolute bottom-20 right-10 h-60 w-60 rounded-full" 
          style={{ backgroundColor: colors.secondary, filter: 'blur(80px)' }}></div>
      </div>

      <div className="w-full max-w-4xl z-10">
        {/* Header with mystical elements */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 rounded-full mb-4" style={{ backgroundColor: colors.primary + '10' }}>
            <Sparkles className="h-12 w-12" style={{ color: colors.secondary }} />
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: colors.primary }}>
            Join Our Circle of Light
          </h1>
          <p className="text-lg" style={{ color: colors.bgLight }}>
            Share your gifts with those seeking guidance
          </p>
        </div>

        <div className="grid md:grid-cols-1 gap-8">
          {/* Registration Form */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader className="pb-6 border-b"
              style={{ borderColor: colors.secondary + '20' }}>
              <CardTitle className="text-2xl font-bold flex items-center gap-3"
                style={{ color: colors.primary }}>
                <UserPlus className="h-6 w-6" style={{ color: colors.secondary }} />
                Application Form
              </CardTitle>
              <CardDescription>
                Fill in your details to apply. All fields are required.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Profile Image Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 font-bold"
                    style={{ color: colors.primary }}>
                    <User className="h-4 w-4" />
                    Profile Photo
                  </Label>
                  <div className="flex items-center gap-6">
                    <div 
                      className="relative group cursor-pointer"
                      onMouseEnter={() => setIsHovered(true)}
                      onMouseLeave={() => setIsHovered(false)}
                    >
                      <div className="h-20 w-20 rounded-full border-4 overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                        style={{ 
                          borderColor: colors.secondary,
                          backgroundColor: colors.secondary + '10'
                        }}>
                        {imagePreviewUrl ? (
                          <img 
                            src={imagePreviewUrl} 
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : formData.image ? (
                          <img 
                            src={formData.image} 
                            alt="Current"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="h-8 w-8" style={{ color: colors.secondary + '50' }} />
                          </div>
                        )}
                      </div>
                      
                      {(imagePreviewUrl || formData.image) && (
                        <button
                          type="button"
                          className="absolute -top-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                          onClick={removeImage}
                          style={{ 
                            backgroundColor: colors.danger,
                            color: 'white'
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Upload className="h-8 w-8 text-white drop-shadow-lg" />
                      </div>
                      
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id="profile-image"
                        onChange={handleImageChange}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <Label 
                        htmlFor="profile-image"
                        className="cursor-pointer flex items-center gap-2 text-sm font-medium transition-all duration-200 hover:scale-105 inline-block"
                        style={{ color: colors.secondary }}
                      >
                        <Upload className="w-4 h-4" />
                        {imageFile ? "Change image" : "Upload an image"}
                      </Label>
                      <p className="text-xs mt-1" style={{ color: colors.bgLight }}>
                        Recommended: 400x400px, JPG or PNG
                      </p>
                      
                      {/* Image URL Input */}
                      <div className="mt-3">
                        <Input 
                          type="text" 
                          id="image" 
                          value={formData.image} 
                          onChange={handleChange} 
                          placeholder="Or enter an image URL"
                          disabled={!!imageFile}
                          className="text-sm"
                          style={{ 
                            borderColor: colors.secondary + '30',
                            color: colors.primary
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" style={{ color: colors.secondary }} />
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      style={{ 
                        borderColor: colors.secondary + '30',
                        color: colors.primary
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" style={{ color: colors.secondary }} />
                      Email Address *
                    </Label>
                    <Input 
                      id="email" 
                      type="email" 
                      required 
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="votre@email.com"
                      style={{ 
                        borderColor: colors.secondary + '30',
                        color: colors.primary
                      }}
                    />
                  </div>
                </div>

                {/* Password Fields */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" style={{ color: colors.secondary }} />
                      Password *
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimum 8 characters"
                      style={{ 
                        borderColor: colors.secondary + '30',
                        color: colors.primary
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" style={{ color: colors.secondary }} />
                      Confirm password *
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter your password"
                      style={{ 
                        borderColor: colors.secondary + '30',
                        color: colors.primary
                      }}
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Category Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-bold"
                      style={{ color: colors.primary }}>
                      <Layers className="h-4 w-4" style={{ color: colors.secondary }} />
                      Main Category *
                    </Label>
                    <Select onValueChange={handleCategoryChange} required>
                      <SelectTrigger style={{
                        borderColor: colors.secondary + '30',
                        color: colors.primary
                      }}>
                        <SelectValue placeholder="Select your main category" />
                      </SelectTrigger>
                      <SelectContent>
                        {psychicCategories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            <div className="flex items-center gap-2">
                              <span style={{ color: colors.secondary }}>{category.icon}</span>
                              <span>{category.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs mt-1" style={{ color: colors.bgLight }}>
                      Choose the category that best describes your main gift
                    </p>
                  </div>

                  {/* Gender Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" style={{ color: colors.secondary }} />
                      Gender *
                    </Label>
                    <Select onValueChange={handleGenderChange} required>
                      <SelectTrigger style={{
                        borderColor: colors.secondary + '30',
                        color: colors.primary
                      }}>
                        <SelectValue placeholder="Select your gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other / Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Location & Languages */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" style={{ color: colors.secondary }} />
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g. London, UK"
                      style={{ 
                        borderColor: colors.secondary + '30',
                        color: colors.primary
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="languages" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" style={{ color: colors.secondary }} />
                      Languages
                    </Label>
                    <Input
                      id="languages"
                      value={formData.languages}
                      onChange={handleChange}
                      placeholder="English, French, Spanish"
                      style={{ 
                        borderColor: colors.secondary + '30',
                        color: colors.primary
                      }}
                    />
                    <p className="text-xs" style={{ color: colors.bgLight }}>
                      Separate multiple languages with commas
                    </p>
                  </div>
                </div>

                {/* Experience & Specialization */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experience" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" style={{ color: colors.secondary }} />
                      Experience (years)
                    </Label>
                    <Input 
                      id="experience" 
                      type="number"
                      min="0"
                      max="50"
                      value={formData.experience}
                      onChange={handleChange}
                      placeholder="5"
                      style={{ 
                        borderColor: colors.secondary + '30',
                        color: colors.primary
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialization" className="flex items-center gap-2">
                      <Award className="h-4 w-4" style={{ color: colors.secondary }} />
                      Specialization
                    </Label>
                    <Input
                      id="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                      placeholder="e.g. Love & Relationships"
                      style={{ 
                        borderColor: colors.secondary + '30',
                        color: colors.primary
                      }}
                    />
                  </div>
                </div>

                {/* Abilities */}
                <div className="space-y-2">
                  <Label htmlFor="abilities" className="flex items-center gap-2">
                    <Award className="h-4 w-4" style={{ color: colors.secondary }} />
                    Special Abilities
                  </Label>
                  <Input
                    id="abilities"
                    value={formData.abilities}
                    onChange={handleChange}
                    placeholder="Tarot, Astrology, Numerology, Mediumship"
                    style={{
                      borderColor: colors.secondary + '30',
                      color: colors.primary
                    }}
                  />
                  <p className="text-xs" style={{ color: colors.bgLight }}>
                    Separate multiple abilities with commas
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" style={{ color: colors.secondary }} />
                    Biography / Specialization *
                  </Label>
                  <textarea
                    id="bio"
                    rows={4}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 resize-none transition-all duration-200 focus:scale-[1.01]"
                    placeholder="Tell us about your spiritual gifts, your experience and your areas of expertise..."
                    required
                    value={formData.bio}
                    onChange={handleChange}
                    style={{ 
                      borderColor: colors.secondary + '30',
                      color: colors.primary,
                      minHeight: '100px'
                    }}
                  />
                  <p className="text-xs" style={{ color: colors.bgLight }}>
                    Describe your psychic abilities, your reading styles and what clients can expect
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full font-bold text-lg py-6 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                  style={{ 
                    backgroundColor: colors.secondary,
                    color: colors.primary
                  }}
                  disabled={loading || isUploadingImage}
                >
                  {(loading || isUploadingImage) ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {isUploadingImage ? "Uploading image..." : "Submitting application..."}
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Apply as a Psychic
                    </>
                  )}
                </Button>
              </form>

              {/* Terms Note */}
              <div className="text-center text-sm pt-4 border-t"
                style={{ borderColor: colors.secondary + '20', color: colors.bgLight }}>
                <p className="flex items-center justify-center gap-2">
                  <Shield className="h-4 w-4" style={{ color: colors.success }} />
                  Your information is secure and encrypted
                </p>
                <p className="mt-1 text-xs">
                  By applying, you agree to our Terms of Use and Privacy Policy
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-sm" style={{ color: colors.bgLight }}>
            <span className="font-bold" style={{ color: colors.primary }}>Note:</span>
            {" "}All applications are reviewed manually. Approval can take 24 to 48 hours.
          </p>
        </div>
      </div>
    </div>
  );
}