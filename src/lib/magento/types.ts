/** Node from `data/categories.json` (settings file) or `V1/categories`. */
export type Category = {
  id: number;
  parent_id: number;
  name: string;
  custom_image?: string;
  is_active: boolean;
  include_in_menu?: boolean;
  position: number;
  level: number;
  product_count: number;
  children_data: Category[];
};

export type CustomAttribute = {
  attribute_code: string;
  value: string | string[];
};

export type MediaGalleryEntry = {
  id: number;
  media_type: string;
  label: string | null;
  position: number;
  disabled: boolean;
  types: string[];
  file: string;
};

/** Item from `V1/mstore/products`. */
export type Product = {
  id: number;
  sku: string;
  name: string;
  price: number;
  status: number;
  visibility: number;
  type_id: string;
  media_gallery_entries: MediaGalleryEntry[];
  custom_attributes: CustomAttribute[];
  extension_attributes?: {
    website_ids?: number[];
    category_links?: { position: number; category_id: string }[];
  };
};

export type SearchResult<T> = {
  items: T[];
  total_count: number;
};
