/**
 * WorkOrder and CMMS Type Definitions & Constants
 * Ported from beecaro for beecarbonat_app
 */

/**
 * @typedef {Object} ProcedureStep
 * @property {string} id
 * @property {number} stepNumber
 * @property {string} title
 * @property {string} [description]
 * @property {boolean} completed
 * @property {string} [completedAt]
 * @property {string} [completedBy]
 * @property {boolean} [requiredValidation]
 */

/**
 * @typedef {Object} WorkOrderAuditEntry
 * @property {string} id
 * @property {string} timestamp
 * @property {string} user
 * @property {string} action
 * @property {string} [fieldChanged]
 * @property {string} [oldValue]
 * @property {string} [newValue]
 * @property {string} [comment]
 * @property {string} [details]
 */

/**
 * @typedef {Object} WorkOrderPartItem
 * @property {string} name
 * @property {number} cost
 * @property {number} quantity
 * @property {string} [partNumber]
 */

/**
 * @typedef {Object} AssignedTechnician
 * @property {string|number} [id]
 * @property {string} name
 * @property {string} [avatar]
 * @property {string} role
 * @property {string} [company]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {'internal'|'subcontractor'} [type]
 */

/**
 * @typedef {Object} WorkOrder
 * @property {string} id
 * @property {string} ticketNumber
 * @property {string} title
 * @property {string} description
 * @property {string} [assetId]
 * @property {string} [assetName]
 * @property {string} buildingId
 * @property {string} buildingName
 * @property {string} [buildingAddress]
 * @property {string} [buildingCity]
 * @property {string} [buildingContact]
 * @property {string} [buildingPhone]
 * @property {string} floor
 * @property {'low'|'medium'|'high'|'critical'} priority
 * @property {'open'|'in_progress'|'pending_parts'|'resolved'|'closed'} status
 * @property {'preventive'|'corrective'|'inspection'|'emergency'|'esg_audit'} category
 * @property {AssignedTechnician} assignedTechnician
 * @property {string} createdAt
 * @property {string} slaDeadline
 * @property {number} estimatedHours
 * @property {number} [actualHours]
 * @property {WorkOrderPartItem[]} [partsUsed]
 * @property {string} [signatureUrl]
 * @property {ProcedureStep[]} [procedureSteps]
 * @property {string} [resolutionNotes]
 * @property {string} [rootCause]
 * @property {WorkOrderAuditEntry[]} [auditLog]
 */

export const WORK_ORDER_PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const WORK_ORDER_STATUSES = ['open', 'in_progress', 'pending_parts', 'resolved', 'closed'];
export const WORK_ORDER_CATEGORIES = ['preventive', 'corrective', 'inspection', 'emergency', 'esg_audit'];
