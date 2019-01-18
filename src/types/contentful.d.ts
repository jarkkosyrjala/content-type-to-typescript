import { Field } from 'contentful/index';

export { ContentType } from 'contentful/index';

interface Validation {
  linkContentType?: string[];
}
export interface ContentfulField extends Field {
  items?: ContentfulField;
  validations?: Validation[];
}
