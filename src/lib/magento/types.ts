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

/** Attribute on `V1/aaw/productdetail` items; `label` holds the option text. */
export type DetailAttribute = {
  attribute_code: string;
  value: string;
  label?: string;
  /** Sort order of the option (sizes come in shop order this way). */
  position?: string;
};

/** Item from `V1/aaw/productdetail/{id}` and `V1/mstore/recommend-products/sku/{sku}`. */
export type ProductDetail = {
  id: string;
  sku: string;
  name: string;
  image: string | null;
  brand: string | null;
  type_id: string;
  /** Image paths relative to /media/catalog/product. */
  media_gallery_entries?: string[];
  price: string;
  special_price?: string | null;
  special_from_date?: string | null;
  special_to_date?: string | null;
  visibility: string;
  /** Present on simple products and children; absent on configurable parents. */
  stock?: number;
  item_is_salable: boolean;
  url?: string;
  custom_attributes: DetailAttribute[];
  /** Simple child products of a configurable product (one per size). */
  childrens?: ProductDetail[];
  related?: ProductDetail[];
  description?: string | null;
};
