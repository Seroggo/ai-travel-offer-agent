import { z } from "zod";
import { TravelSearchRequestSchema } from "./travel-request.ts";
import { NormalizedTourSchema } from "./normalized-tour.ts";
import { RankedTourSchema } from "./ranking.ts";

export const WorkflowStatusSchema = z.enum([
  "clarification_required",
  "completed",
  "completed_with_warnings",
  "failed",
]);
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

export const WorkflowMetaSchema = z.object({
  duration_ms: z.number().nonnegative().finite(),
}).strict();
export type WorkflowMeta = z.infer<typeof WorkflowMetaSchema>;

export const WorkflowErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
}).strict();
export type WorkflowError = z.infer<typeof WorkflowErrorSchema>;

export const ClarificationWorkflowResponseSchema = z.object({
  request_id: z.string().uuid(),
  status: z.literal("clarification_required"),
  parsed_request: TravelSearchRequestSchema,
  clarification_required: z.literal(true),
  clarification_question: z.string().min(1),
  missing_required_fields: z.array(z.string()).min(1),
  search_mode: z.literal("mock"),
  normalized_tours: z.array(z.never()),
  ranked_tours: z.array(z.never()),
  agent_summary: z.null(),
  client_message: z.null(),
  warnings: z.array(z.string()),
  error: z.null(),
  meta: WorkflowMetaSchema,
}).strict();
export type ClarificationWorkflowResponse = z.infer<
  typeof ClarificationWorkflowResponseSchema
>;

export const CompletedWorkflowResponseSchema = z.object({
  request_id: z.string().uuid(),
  status: z.enum(["completed", "completed_with_warnings"]),
  parsed_request: TravelSearchRequestSchema,
  clarification_required: z.literal(false),
  clarification_question: z.null(),
  missing_required_fields: z.array(z.never()),
  search_mode: z.literal("mock"),
  normalized_tours: z.array(NormalizedTourSchema),
  ranked_tours: z.array(RankedTourSchema),
  agent_summary: z.string().min(1),
  client_message: z.string().min(1),
  warnings: z.array(z.string()),
  error: z.null(),
  meta: WorkflowMetaSchema,
}).strict().refine(
  (data) => {
    if (data.status === "completed_with_warnings" && data.warnings.length === 0) {
      return false;
    }
    return true;
  },
  {
    message: "completed_with_warnings must have at least one warning",
    path: ["warnings"],
  },
);
export type CompletedWorkflowResponse = z.infer<
  typeof CompletedWorkflowResponseSchema
>;

export const FailedWorkflowResponseSchema = z.object({
  request_id: z.string().uuid(),
  status: z.literal("failed"),
  parsed_request: TravelSearchRequestSchema.nullable(),
  clarification_required: z.literal(false),
  clarification_question: z.null(),
  missing_required_fields: z.array(z.string()),
  search_mode: z.literal("mock"),
  normalized_tours: z.array(NormalizedTourSchema),
  ranked_tours: z.array(RankedTourSchema),
  agent_summary: z.string().min(1),
  client_message: z.null(),
  warnings: z.array(z.string()),
  error: WorkflowErrorSchema,
  meta: WorkflowMetaSchema,
}).strict();
export type FailedWorkflowResponse = z.infer<typeof FailedWorkflowResponseSchema>;

export const WorkflowResponseSchema = z.discriminatedUnion("status", [
  ClarificationWorkflowResponseSchema,
  CompletedWorkflowResponseSchema,
  FailedWorkflowResponseSchema,
]);
export type WorkflowResponse = z.infer<typeof WorkflowResponseSchema>;
