/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * This file is auto-generated. Do not modify it manually.
 * Changes to this file may be overwritten.
 */

export const dataSourcesInfo = {
  "cr04e_canaldedistributionreferentiels": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_canaldedistributionreferentielid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_canauxdedistributions": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_canauxdedistributionid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_centredeprofitcepcts": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_centredeprofitcepctid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_centredeprofittkao2s": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_centredeprofittkao2id",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_classedevalorisations": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_classedevalorisationid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_divisionprojets": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_divisionprojetid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_divisionusines": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_divisionusineid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_fluxregistres": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_fluxregistreid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_gestiondeserreurses": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_gestiondeserreursid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_groupearticledivisions": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_groupearticledivisionid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_groupedefraisgenerauxes": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_groupedefraisgenerauxid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_hierarchieproduitfamilles": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_hierarchieproduitfamilleid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "new_libellepayses": {
    "tableId": "",
    "version": "",
    "primaryKey": "new_libellepaysid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_optionsetcodeappses": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_optionsetcodeappsid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_organisationcommercialereferentiels": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_organisationcommercialereferentielid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_projets": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_projetid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_societereferentiels": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_societereferentielid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "cr04e_unitofmeasures": {
    "tableId": "",
    "version": "",
    "primaryKey": "cr04e_unitofmeasureid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "office365groups": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "ListGroupMembers": {
        "path": "/{connectionId}/v1.0/groups/{groupId}/members",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "groupId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "$top",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "OnGroupMembershipChange": {
        "path": "/{connectionId}/trigger/v1.0/groups/delta",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "groupId",
            "in": "query",
            "required": true,
            "type": "string"
          },
          {
            "name": "$select",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          }
        }
      },
      "AddMemberToGroup": {
        "path": "/{connectionId}/v1.0/groups/{groupId}/members/$ref",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "groupId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "userUpn",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "204": {
            "type": "void"
          }
        }
      },
      "ListOwnedGroups": {
        "path": "/{connectionId}/v1.0/me/memberOf/$/microsoft.graph.group",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "ListOwnedGroups_V2": {
        "path": "/{connectionId}/v1.0/me/ownedObjects/$/microsoft.graph.group",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "extractSensitivityLabel",
            "in": "query",
            "required": false,
            "type": "boolean"
          },
          {
            "name": "fetchSensitivityLabelMetadata",
            "in": "query",
            "required": false,
            "type": "boolean"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "ListOwnedGroups_V3": {
        "path": "/{connectionId}/v2/v1.0/me/memberOf/$/microsoft.graph.group",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "extractSensitivityLabel",
            "in": "query",
            "required": false,
            "type": "boolean"
          },
          {
            "name": "fetchSensitivityLabelMetadata",
            "in": "query",
            "required": false,
            "type": "boolean"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "ListGroups": {
        "path": "/{connectionId}/v1.0/groups",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "extractSensitivityLabel",
            "in": "query",
            "required": false,
            "type": "boolean"
          },
          {
            "name": "fetchSensitivityLabelMetadata",
            "in": "query",
            "required": false,
            "type": "boolean"
          },
          {
            "name": "$filter",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "$top",
            "in": "query",
            "required": false,
            "type": "integer"
          },
          {
            "name": "$skiptoken",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "CreateCalendarEvent": {
        "path": "/{connectionId}/v1.0/groups/{groupId}/events",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "groupId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "201": {
            "type": "object"
          }
        }
      },
      "CreateCalendarEventV2": {
        "path": "/{connectionId}/v2/v1.0/groups/{groupId}/events",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "groupId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "201": {
            "type": "object"
          }
        }
      },
      "CalendarDeleteItem_V2": {
        "path": "/{connectionId}/v1.0/groups/{groupId}/events/{event}",
        "method": "DELETE",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "groupId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "event",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "204": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "UpdateCalendarEvent": {
        "path": "/{connectionId}/v1.0/groups/{groupId}/events/{event}",
        "method": "PATCH",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "groupId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "event",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "RemoveMemberFromGroup": {
        "path": "/{connectionId}/v1.0/groups/{groupId}/members/memberId/$ref",
        "method": "DELETE",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "groupId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "userUpn",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "204": {
            "type": "void"
          }
        }
      },
      "OnNewEvent": {
        "path": "/{connectionId}/trigger/v1.0/groups/{groupId}/events",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "groupId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          }
        }
      },
      "HttpRequestV2": {
        "path": "/{connectionId}/v2/httprequest",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Uri",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "Method",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "Body",
            "in": "body",
            "required": false,
            "type": "object"
          },
          {
            "name": "ContentType",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader1",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader2",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader3",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader4",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader5",
            "in": "header",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "HttpRequest": {
        "path": "/{connectionId}/httprequest",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Uri",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "Method",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "Body",
            "in": "body",
            "required": false,
            "type": "object"
          },
          {
            "name": "ContentType",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader1",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader2",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader3",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader4",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "CustomHeader5",
            "in": "header",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "ListDeletedGroups": {
        "path": "/{connectionId}/v1.0/directory/deletedItems/microsoft.graph.group",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "RestoreDeletedGroup": {
        "path": "/{connectionId}/v1.0/directory/deletedItems/{groupId}/restore",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "groupId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      },
      "ListDeletedGroupsByOwner": {
        "path": "/{connectionId}/v1.0/directory/deletedItems/getUserOwnedObjects",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "userId",
            "in": "header",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      }
    }
  }
};
