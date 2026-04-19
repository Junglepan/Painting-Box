pub mod brand;

use std::{fs::File, io::BufReader, path::Path};

use exif::{In, Reader, Tag, Value};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CameraInfo {
    pub make: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpsInfo {
    pub lat: f64,
    pub lng: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExifData {
    pub camera: CameraInfo,
    pub lens: String,
    pub iso: u32,
    pub aperture: f64,
    pub shutter_speed: String,
    pub focal_length: f64,
    pub taken_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gps: Option<GpsInfo>,
}

impl Default for ExifData {
    fn default() -> Self {
        Self {
            camera: CameraInfo {
                make: String::new(),
                model: String::new(),
            },
            lens: String::new(),
            iso: 0,
            aperture: 0.0,
            shutter_speed: String::new(),
            focal_length: 0.0,
            taken_at: String::new(),
            gps: None,
        }
    }
}

pub fn read_exif(path: &Path) -> ExifData {
    let Ok(file) = File::open(path) else {
        return ExifData::default();
    };
    let mut reader = BufReader::new(file);
    let Ok(exif) = Reader::new().read_from_container(&mut reader) else {
        return ExifData::default();
    };

    let mut data = ExifData::default();

    data.camera.make = text_field(&exif, Tag::Make);
    data.camera.model = text_field(&exif, Tag::Model);
    data.lens = text_field(&exif, Tag::LensModel);
    data.iso = rational_u32(&exif, Tag::PhotographicSensitivity)
        .or_else(|| rational_u32(&exif, Tag::ISOSpeed))
        .unwrap_or(0);
    data.aperture = rational_f64(&exif, Tag::FNumber).unwrap_or(0.0);
    data.focal_length = rational_f64(&exif, Tag::FocalLength).unwrap_or(0.0);
    data.shutter_speed =
        text_field(&exif, Tag::ExposureTime).replace(" sec.", "s");
    data.taken_at = text_field(&exif, Tag::DateTimeOriginal);
    data.gps = gps(&exif);

    data
}

fn text_field(exif: &exif::Exif, tag: Tag) -> String {
    exif.get_field(tag, In::PRIMARY)
        .map(|field| sanitize_text(field.display_value().with_unit(exif).to_string()))
        .unwrap_or_default()
}

fn sanitize_text(value: String) -> String {
    value.trim().trim_matches('"').to_string()
}

fn rational_f64(exif: &exif::Exif, tag: Tag) -> Option<f64> {
    let field = exif.get_field(tag, In::PRIMARY)?;
    match &field.value {
        Value::Rational(values) if !values.is_empty() => {
            let value = values[0];
            Some(value.num as f64 / value.denom as f64)
        }
        Value::SRational(values) if !values.is_empty() => {
            let value = values[0];
            Some(value.num as f64 / value.denom as f64)
        }
        _ => None,
    }
}

fn rational_u32(exif: &exif::Exif, tag: Tag) -> Option<u32> {
    let field = exif.get_field(tag, In::PRIMARY)?;
    match &field.value {
        Value::Short(values) if !values.is_empty() => Some(values[0] as u32),
        Value::Long(values) if !values.is_empty() => Some(values[0]),
        Value::Rational(values) if !values.is_empty() => {
            let value = values[0];
            Some(value.num / value.denom)
        }
        _ => None,
    }
}

fn gps(exif: &exif::Exif) -> Option<GpsInfo> {
    let lat = gps_coord(exif, Tag::GPSLatitude, Tag::GPSLatitudeRef)?;
    let lng = gps_coord(exif, Tag::GPSLongitude, Tag::GPSLongitudeRef)?;
    Some(GpsInfo { lat, lng })
}

fn gps_coord(exif: &exif::Exif, tag: Tag, ref_tag: Tag) -> Option<f64> {
    let field = exif.get_field(tag, In::PRIMARY)?;
    let ref_field = text_field(exif, ref_tag);
    let values = match &field.value {
        Value::Rational(values) if values.len() >= 3 => values,
        _ => return None,
    };
    let degrees = values[0].num as f64 / values[0].denom as f64;
    let minutes = values[1].num as f64 / values[1].denom as f64;
    let seconds = values[2].num as f64 / values[2].denom as f64;
    let mut result = degrees + minutes / 60.0 + seconds / 3600.0;
    if matches!(ref_field.as_str(), "S" | "W") {
        result *= -1.0;
    }
    Some(result)
}

#[cfg(test)]
mod tests {
    use super::sanitize_text;

    #[test]
    fn strips_wrapping_quotes_from_exif_text() {
        assert_eq!(sanitize_text("\"NIKON CORPORATION\"".to_string()), "NIKON CORPORATION");
        assert_eq!(sanitize_text("\"NIKKOR Z 70-200mm f/2.8 VR S\"".to_string()), "NIKKOR Z 70-200mm f/2.8 VR S");
    }
}
