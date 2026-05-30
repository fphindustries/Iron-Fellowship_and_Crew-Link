import { Grid } from "@mui/material";
import { DebouncedOracleInput } from "components/shared/DebouncedOracleInput";
import { StarforgedLocationOther } from "types/SectorLocations.type";
import { ignoreApiError } from "config/api.config";
import { useSectorLocationMutations } from "./useSectorLocationMutations";

export interface OtherContentProps {
  locationId: string;
  location: StarforgedLocationOther;
}
export function OtherContent(props: OtherContentProps) {
  const { locationId, location } = props;

  const { updateLocation } = useSectorLocationMutations();

  return (
    <>
      <Grid item xs={12} sm={6}>
        <DebouncedOracleInput
          label={"Name"}
          oracleTableId={undefined}
          initialValue={location.name}
          updateValue={(value) =>
            updateLocation(locationId, { name: value }).catch(ignoreApiError)
          }
        />
      </Grid>
    </>
  );
}
