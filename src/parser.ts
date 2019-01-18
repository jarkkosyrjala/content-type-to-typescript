import { chain, deburr, trim, upperFirst } from 'lodash';
import { buildRef, Location } from './built-in-definitions';
import { ContentfulField, ContentType } from './types/contentful';
import { JSONSchema } from './types/json-schema';

const toInterfaceName = (s: string): string => {
  return upperFirst(
    // remove accents, umlauts, ... by their basic latin letters
    deburr(s)
    // replace chars which are not valid for typescript identifiers with whitespace
      .replace(/(^\s*[^a-zA-Z_$])|([^a-zA-Z_$\d])/g, ' ')
      // uppercase leading underscores followed by lowercase
      .replace(/^_[a-z]/g, (match) => match.toUpperCase())
      // remove non-leading underscores followed by lowercase (convert snake_case)
      .replace(/_[a-z]/g, (match) => match.substr(1, match.length).toUpperCase())
      // uppercase letters after digits, dollars
      .replace(/([\d$]+[a-zA-Z])/g, (match) => match.toUpperCase())
      // uppercase first letter after whitespace
      .replace(/\s+([a-zA-Z])/g, (match) => {
        return trim(match.toUpperCase());
      })
      // remove remaining whitespace
      .replace(/\s/g, ''));
}

function fieldToJsonSchema(fieldInfo: ContentfulField): any {
  let result: any;
  switch (fieldInfo.type) {
    case 'Symbol':
    case 'Text':
    case 'Date':
      result = {
        type: 'string',
      };
      break;
    case 'Number':
    case 'Integer':
      result = {
        type: 'number',
      };
      break;
    case 'Boolean':
      result = {
        type: 'boolean',
      };
      break;
    case 'Location':
      result = {
        $ref: buildRef(Location),
      };
      break;
    case 'Object':
      result = {
        type: 'object',
      };
      break;
    case 'Array':
      if (!fieldInfo.items) {
        throw new Error('Unexpected Content Type structure.');
      }
      result = {
        items: fieldToJsonSchema(fieldInfo.items),
        type: 'array',
      };
      break;
    case 'Link':
      if (fieldInfo.linkType === 'Asset') {
        result = {
          tsType: `Asset`,
        };
      } else if (fieldInfo.linkType === 'Entry') {
        let linkType = 'any';
        if ( fieldInfo.validations &&
            fieldInfo.validations.length > 0) {

          const validation = fieldInfo.validations.find( ( v ) => {
            return v.hasOwnProperty('linkContentType');
          });
          if ( validation && validation.linkContentType && validation.linkContentType.length > 0 ) {
            linkType = validation.linkContentType.map((s: string) => {
              return toInterfaceName(s);
            }).join(' | ');
          }
        }

        result = {
          tsType: `Entry<${linkType}>`,
        };
      } else {
        throw new Error('Unexpected Content Type structure.');
      }
      break;
    default:
      throw new Error(`Type ${fieldInfo.type} is not yet supported`);
  }

  return result;
}

function transformFields(contentTypeInfo: Partial<ContentType>): JSONSchema {
  const properties = chain(contentTypeInfo.fields)
    .filter((fieldInfo) => !fieldInfo.omitted)
    .map((fieldInfo) => [fieldInfo.id, fieldToJsonSchema(fieldInfo)])
    .fromPairs()
    .value();

  const required = chain(contentTypeInfo.fields)
    .filter((fieldInfo) => fieldInfo.required)
    .map((fieldInfo) => fieldInfo.id)
    .value();

  return {
    properties,
    required,
    additionalProperties: false,
  };
}

export function convertToJSONSchema(contentTypeInfo: ContentType): JSONSchema {
  const resultSchema: JSONSchema = {
    title: contentTypeInfo.sys.id,
    description: contentTypeInfo.description,
    ...transformFields(contentTypeInfo),
  };

  return resultSchema;
}
