export interface FacebookPage {
  id: string;
  name: string;
  instagram_business_account?: {
    id: string;
  };
  access_token: string;
}